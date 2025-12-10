Table users {
  id int [pk]
  username varchar [note: 'Reference to Auth Service']
}

Table chat_channels {
  id int [pk, increment]
  name varchar [not null]
  type varchar [not null] // direct, group, public
  created_by int [ref: > users.id, not null]
  is_private boolean [default: false]
  created_at timestamp [default: `now()`]
  updated_at timestamp
}

Table chat_participants {
  id int [pk, increment]
  channel_id int [ref: > chat_channels.id]
  user_id int [ref: > users.id, not null]
  role varchar [default: 'member'] // owner, admin, member
  created_at timestamp [default: `now()`]
  updated_at timestamp

  indexes {
    (channel_id, user_id) [unique]
  }
}

Table chat_messages {
  id int [pk, increment]
  channel_id int [ref: > chat_channels.id]
  user_id int [ref: > users.id, not null]
  content text [not null]
  is_read boolean [default: false]
  created_at timestamp [default: `now()`]
  updated_at timestamp
}

Table user_blocks {
  id int [pk, increment]
  blocker_id int [ref: > users.id, not null]
  blocked_id int [ref: > users.id, not null]
  created_at timestamp [default: `now()`]
  updated_at timestamp

  indexes {
    (blocker_id, blocked_id) [unique]
  }
}

Table game_invitations {
  id int [pk, increment]
  sender_id int [ref: > users.id, not null]
  receiver_id int [ref: > users.id, not null]
  game_type varchar [not null] // pong, other_game
  status varchar [not null] // pending, accepted, declined, expired
  created_at timestamp [default: `now()`]
  updated_at timestamp
  expires_at timestamp
}