# ft_transcendence Project Structure

## Microservices Architecture

```
ft_transcendence/
├── services/                  # All microservices
│   ├── auth-service/          # Authentication service
│   │   ├── src/               # Source code
│   │   ├── tests/             # Tests
│   │   ├── Dockerfile         # Docker configuration
│   │   └── package.json       # Dependencies
│   │
│   ├── user-service/          # User management service
│   │   ├── src/
│   │   ├── tests/
│   │   ├── Dockerfile
│   │   └── package.json
│   │
│   ├── game-service/          # Pong game service
│   │   ├── src/
│   │   ├── tests/
│   │   ├── Dockerfile
│   │   └── package.json
│   │
│   ├── chat-service/          # Chat functionality service
│   │   ├── src/
│   │   ├── tests/
│   │   ├── Dockerfile
│   │   └── package.json
│   │
│   └── analytics-service/     # User stats and game analytics
│       ├── src/
│       ├── tests/
│       ├── Dockerfile
│       └── package.json
│
├── api-gateway/               # API Gateway for service orchestration
│   ├── src/
│   ├── tests/
│   ├── Dockerfile
│   └── package.json
│
├── frontend/                  # Frontend application (TypeScript)
│   ├── public/
│   ├── src/
│   │   ├── components/        # Reusable UI components
│   │   ├── pages/             # Application pages
│   │   ├── hooks/             # Custom React hooks
│   │   ├── services/          # API services
│   │   ├── utils/             # Utility functions
│   │   ├── types/             # TypeScript type definitions
│   │   ├── assets/            # Static assets
│   │   ├── App.tsx            # Main App component
│   │   └── index.tsx          # Entry point
│   │
│   ├── Dockerfile
│   ├── package.json
│   └── tsconfig.json
│
├── db/                        # Database related files
│   ├── migrations/            # Database migrations
│   ├── seeds/                 # Seed data
│   └── scripts/               # Database scripts
│
├── nginx/                     # Nginx configuration for reverse proxy
│   └── nginx.conf
│
├── docker-compose.yml         # Docker compose configuration
├── .env.example               # Example environment variables
├── .gitignore                 # Git ignore file
└── README.md                  # Project documentation
```

## Service Responsibilities

### Auth Service
- User authentication
- JWT token management
- OAuth integration (Google Sign-in)
- Two-factor authentication (2FA)

### User Service
- User profile management
- Friend relationships
- Avatar management
- User statistics

### Game Service
- Pong game logic
- Game matchmaking
- Tournament management
- Game history
- Multiplayer functionality
- AI opponent

### Chat Service
- Live chat functionality
- Direct messaging
- User blocking
- Game invitations

### Analytics Service
- User statistics
- Game analytics
- Dashboards

### API Gateway
- Request routing
- Service discovery
- Load balancing
- Authentication middleware
- Rate limiting

### Frontend
- Single-page application
- Responsive design
- Game interface
- User interface

## Database Schema

Each service will have its own database namespace with the following main tables:

### Auth DB
- users (credentials, auth methods)
- sessions
- tokens

### User DB
- profiles (display name, avatar, etc.)
- friendships
- user_stats

### Game DB
- games
- tournaments
- game_history
- matchmaking

### Chat DB
- messages
- channels
- blocks

## Deployment Considerations

- Use Docker for containerization
- Implement centralized logging with ELK stack
- Set up monitoring with Prometheus and Grafana
- Use environment variables for configuration
- Implement health checks for each service 