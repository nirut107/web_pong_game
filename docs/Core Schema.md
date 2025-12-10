Table users {
  id int [pk, increment]
  username varchar [unique, not null]
  email varchar [unique, not null]
  password_hash varchar [not null]
  created_at timestamp [default: `now()`]
}

Table profiles {
  id int [pk, increment]
  user_id int [ref: > users.id, unique]
  display_name varchar [not null]
  avatar_url varchar
  status varchar [default: 'offline'] // online, offline, in_game
}

Table games {
  id int [pk, increment]
  game_type varchar [not null] // pong, other_game
  status varchar [not null] // waiting, in_progress, completed
  created_at timestamp [default: `now()`]
  completed_at timestamp
}

Table game_participants {
  id int [pk, increment]
  game_id int [ref: > games.id]
  user_id int [ref: > users.id]
  score int [default: 0]
  is_winner boolean [default: false]
}

Table tournaments {
  id int [pk, increment]
  name varchar [not null]
  status varchar [not null] // pending, in_progress, completed
  winner_id int [ref: > users.id]
  max_participants int [not null]
}

Table chat_channels {
  id int [pk, increment]
  name varchar [not null]
  type varchar [not null] // direct, group, public
  created_by int [ref: > users.id]
}

Table chat_messages {
  id int [pk, increment]
  channel_id int [ref: > chat_channels.id]
  user_id int [ref: > users.id]
  content text [not null]
  created_at timestamp [default: `now()`]
}