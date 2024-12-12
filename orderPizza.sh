#!/bin/bash
host="pizza-service.valoren.click"
response=$(curl -s -X PUT pizza-service.valoren.click/api/auth -d '{"email":"d@jwt.com", "password":"diner"}' -H 'Content-Type: application/json')
token=$(echo $response | jq -r '.token')
echo "Login diner..."
  echo $token
  result=$(curl -s -X POST $host/api/order -H 'Content-Type: application/json' -d '{"franchiseId": 1, "storeId":1, "items":[{ "menuId": 1, "description": "Veggie", "price": 1.05 },{ "menuId": 1, "description": "Veggie", "price": 1.05 }]}'  -H "Authorization: Bearer $token" > /dev/null)
  echo $result
  echo "Bought a pizza..."

  curl -s -X DELETE pizza-service.valoren.click/api/auth -H "Authorization: Bearer $token" > /dev/null