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

push-page-count:
	aws ecr get-login-password --region us-east-2 | docker login --username AWS --password-stdin 843499162610.dkr.ecr.us-east-2.amazonaws.com
	docker build --platform linux/amd64 -t 843499162610.dkr.ecr.us-east-2.amazonaws.com/may/page_count:latest ./functions/page_count
	docker push 843499162610.dkr.ecr.us-east-2.amazonaws.com/may/page_count:latest

