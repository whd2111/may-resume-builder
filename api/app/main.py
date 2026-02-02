import os
import logging
from typing import Optional
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import httpx

logger = logging.getLogger(__name__)

app = FastAPI()

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class Message(BaseModel):
    role: str
    content: str


class ClaudeRequest(BaseModel):
    messages: list[Message]
    systemPrompt: Optional[str] = None


@app.post("/api/claude")
async def claude_proxy(request: ClaudeRequest):
    """Proxy requests to Anthropic Claude API"""
    
    api_key = os.getenv("ANTHROPIC_API_KEY") or os.getenv("VITE_ANTHROPIC")
    
    if not api_key:
        raise HTTPException(status_code=500, detail="API key not configured")
    
    if not request.messages:
        raise HTTPException(status_code=400, detail="Invalid request: messages array required")
    
    messages = [msg.model_dump() for msg in request.messages]
    
    payload = {
        "model": "claude-sonnet-4-20250514",
        "max_tokens": 4096,
        "messages": messages,
    }
    
    if request.systemPrompt:
        payload["system"] = request.systemPrompt
    
    headers = {
        "Content-Type": "application/json",
        "x-api-key": api_key,
        "anthropic-version": "2023-06-01",
    }
    
    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                "https://api.anthropic.com/v1/messages",
                json=payload,
                headers=headers,
                timeout=30.0,
            )
        
        if response.status_code != 200:
            error_data = response.json()
            raise HTTPException(
                status_code=response.status_code,
                detail={"error": "Anthropic API error", "details": error_data},
            )
        
        return response.json()
        
    except httpx.HTTPError as e:
        logger.error(f"HTTP error: {str(e)}")
        raise HTTPException(status_code=500, detail="Error calling Anthropic API")
    except Exception as e:
        logger.error(f"Unexpected error: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")
