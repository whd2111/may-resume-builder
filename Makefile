.PHONY: frontend

start:
	tilt up

frontend:
	@npm run dev --prefix ./frontend

supabase:
	@docker-compose -f ./supabase/docker-compose.yml up