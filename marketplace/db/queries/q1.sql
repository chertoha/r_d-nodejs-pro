SELECT id, status, total, created_at
FROM orders
WHERE user_id = 1
  AND created_at BETWEEN now() - interval '180 days' AND now()
ORDER BY created_at DESC
