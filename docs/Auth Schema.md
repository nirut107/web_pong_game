
Table users {
  id int [pk, increment]
  username varchar [unique, not null]
  email varchar [unique, not null]
  password_hash varchar [not null]
  created_at timestamp [default: `now()`]
  updated_at timestamp
  last_login timestamp
  is_active boolean [default: true]
  is_admin boolean [default: false]
}

Table oauth_accounts {
  id int [pk, increment]
  user_id int [ref: > users.id]
  provider varchar [not null] // "google", etc.
  provider_user_id varchar [not null]
  access_token varchar
  refresh_token varchar
  expires_at timestamp
  created_at timestamp [default: `now()`]
  updated_at timestamp
}

Table sessions {
  id int [pk, increment]
  user_id int [ref: > users.id]
  token varchar [not null]
  ip_address varchar
  user_agent varchar
  expires_at timestamp
  created_at timestamp [default: `now()`]
  updated_at timestamp
}

Table two_factor_auth {
  id int [pk, increment]
  user_id int [ref: > users.id, unique]
  secret varchar [not null]
  is_enabled boolean [default: false]
  created_at timestamp [default: `now()`]
  updated_at timestamp
}