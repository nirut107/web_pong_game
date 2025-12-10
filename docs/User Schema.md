Table users {
  id int [pk]
  username varchar [note: 'Reference to Auth Service']
}

Table profiles {
  id int [pk, increment]
  user_id int [ref: > users.id, unique, not null]
  display_name varchar [not null]
  avatar_url varchar
  status varchar [default: 'offline'] // online, offline, in_game
  bio text
  created_at timestamp [default: `now()`]
  updated_at timestamp
}

Table friendships {
  id int [pk, increment]
  user_id int [ref: > users.id, not null]
  friend_id int [ref: > users.id, not null]
  status varchar [not null] // pending, accepted, blocked
  created_at timestamp [default: `now()`]
  updated_at timestamp

  indexes {
    (user_id, friend_id) [unique]
  }
}

Table user_stats {
  id int [pk, increment]
  user_id int [ref: > users.id, unique, not null]
  games_played int [default: 0]
  games_won int [default: 0]
  games_lost int [default: 0]
  tournaments_played int [default: 0]
  tournaments_won int [default: 0]
  rank int
  created_at timestamp [default: `now()`]
  updated_at timestamp
}