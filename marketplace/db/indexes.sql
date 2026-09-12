-- q1:
CREATE INDEX idx_orders_user_created ON orders (user_id, created_at);

-- q2: status filter "pending" -- partial
CREATE INDEX idx_orders_pending_created ON orders (created_at) WHERE status = 'pending';

-- q3:  lower(email),
CREATE INDEX idx_users_email_lower ON users (lower(email));

-- q4: full-text catalog search -- GIN over the generated tsvector.
CREATE INDEX idx_products_search_vector ON products USING GIN (search_vector);
