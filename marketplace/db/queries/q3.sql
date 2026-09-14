SELECT id, email, full_name
FROM users
WHERE lower(email) = lower('user9999@example.com')
