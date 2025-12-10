Table users {
  id int [pk]
  username varchar [note: 'Reference to Auth Service']
}

Table games {
  id int [pk]
  game_type varchar [note: 'Reference to Game Service']
}

Table user_activity {
  id int [pk, increment]
  user_id int [ref: > users.id, not null]
  action varchar [not null] // login, logout, game_start, etc.
  details text
  created_at timestamp [default: `now()`]
}

Table game_analytics {
  id int [pk, increment]
  game_id int [ref: > games.id]
  duration int // in seconds
  moves_count int
  spectator_count int
  created_at timestamp [default: `now()`]
}