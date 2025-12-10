Table users {
  id int [pk]
  username varchar [note: 'Reference to Auth Service']
}

Table games {
  id int [pk, increment]
  game_type varchar [note: 'Required. Types: pong, coderush, other_game']
  status varchar [note: 'Required. States: waiting, in_progress, completed']
  winner_id int [ref: > users.id]
  loser_id int [ref: > users.id]
  score_winner int
  score_loser int
  tournament_id int [ref: > tournaments.id]
  roomId varchar
  players unsigned int
  position varchar [note: '1L1, 1R1, 1L2, ...']
  remarks varchar
  created_at timestamp
  updated_at timestamp
  completed_at timestamp

  note: {
    tournament_id: 'null when not a tournament game'
    position: 'Required. Format: first number = vertical position, L/R = left/right, last number = horizontal position'
    remarks: 'Optional field'
    created_at: 'Default: current timestamp'
  }
}

Table game_participants {
  id int [pk, increment]
  game_id int [ref: > games.id]
  user_id int [ref: > users.id]
  score int
  is_winner boolean
  elo_changed int
  created_at timestamp
  updated_at timestamp

  note: {
    user_id: 'Required'
    score: 'Default: 0'
    is_winner: 'Default: false'
    elo_changed: 'Nullable. +/- change in ELO rating'
    created_at: 'Default: current timestamp'
  }
}

Table tournaments {
  id int [pk, increment]
  name varchar
  status varchar
  winner_id int [ref: > users.id]
  max_participants int
  current_participants int
  tournament_starts_at datetime
  created_at timestamp
  updated_at timestamp
  started_at timestamp
  completed_at timestamp

  note: {
    name: 'Required'
    status: 'Required. States: pending, in_progress, completed'
    max_participants: 'Required'
    current_participants: 'Default: 0'
    created_at: 'Default: current timestamp'
  }
}

Table tournament_participants {
  id int [pk, increment]
  tournament_id int [ref: > tournaments.id]
  user_id int [ref: > users.id]
  status varchar
  created_at timestamp
  updated_at timestamp

  note: {
    user_id: 'Required'
    status: 'Required. States: active, eliminated'
    created_at: 'Default: current timestamp'
  }
}

Table matchmaking {
  id int [pk, increment]
  user_id int [ref: > users.id]
  game_type varchar
  skill_level int
  status varchar
  created_at timestamp
  updated_at timestamp

  note: {
    user_id: 'Required'
    game_type: 'Required. Types: pong, coderush, other_game'
    status: 'Required. States: waiting, matched'
    created_at: 'Default: current timestamp'
  }
}

Table game_history {
  id int [pk, increment]
  game_id int [ref: > games.id]
  user_id int [ref: > users.id]
  opponent_id int [ref: > users.id]
  user_score int
  opponent_score int
  result varchar
  created_at timestamp

  note: {
    user_id: 'Required'
    opponent_id: 'Required'
    result: 'Required. Values: win, loss, draw'
    created_at: 'Default: current timestamp'
  }
}

// Game-specific performance metrics tables
Table coderush_metrics {
  id int [pk, increment]
  participant_id int [ref: > game_participants.id]
  wpm unsigned int
  created_at timestamp
  updated_at timestamp

  note: {
    participant_id: 'References the participant record'
    created_at: 'Default: current timestamp'
  }
}

Table pong_metrics {
  id int [pk, increment]
  participant_id int [ref: > game_participants.id]
  time_taken unsigned int
  created_at timestamp
  updated_at timestamp

  note: {
    participant_id: 'References the participant record'
    created_at: 'Default: current timestamp'
  }
}


//defunct table
Table game_settings {
  id int [pk, increment]
  user_id int [ref: > users.id, unique]
  difficulty varchar
  theme varchar
  sound_enabled boolean
  created_at timestamp
  updated_at timestamp

  note: {
    user_id: 'Required'
    difficulty: 'Default: normal. Values: easy, normal, hard, ???'
    theme: 'Default: classic'
    sound_enabled: 'Default: true'
    created_at: 'Default: current timestamp'
  }
}