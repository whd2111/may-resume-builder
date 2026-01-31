.PHONY: frontend

start:
	tilt up

frontend:
	@npm run dev --prefix ./frontend