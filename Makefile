.PHONY: frontend

start:
	tilt up

stop:
	tilt down

frontend:
	@npm run dev --prefix ./frontend

supabase:
	@docker-compose -f ./supabase/docker-compose.yml up

supabase-down:
	@docker-compose -f ./supabase/docker-compose.yml down

supabase-migrate:
	@cd supabase && for migration in migrations/*.sql; do \
		echo "Applying $$migration..."; \
		docker exec -i supabase-db psql -U postgres -d postgres -f - < "$$migration"; \
	done