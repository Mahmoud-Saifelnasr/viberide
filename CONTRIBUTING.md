# Contributing to VibeRide

Thank you for your interest in contributing! This document provides guidelines and instructions.

## Getting Started

1. Fork the repository
2. Clone your fork: `git clone https://github.com/YOUR_USERNAME/viberide.git`
3. Add upstream: `git remote add upstream https://github.com/Mahmoud-Saifelnasr/viberide.git`
4. Create feature branch: `git checkout -b feature/AmazingFeature`

## Development Workflow

### Branch Naming

- `feature/description` - New features
- `bugfix/description` - Bug fixes
- `refactor/description` - Code refactoring
- `docs/description` - Documentation updates

### Commit Messages

Use conventional commits:

```
feat: add new ride scheduling feature
fix: resolve GPS tracking lag
refactor: simplify payment logic
docs: update API documentation
test: add unit tests for auth
chore: update dependencies
```

### Code Style

- TypeScript for all new code
- Prettier for formatting
- ESLint for linting
- 2-space indentation
- Max line length: 100 characters

### Type Safety

```typescript
// Always define types explicitly
const getUserName = (userId: string): Promise<string> => {
  // implementation
};

// Use strict types, avoid `any`
const processData = (data: DataType): ResultType => {
  // implementation
};
```

## Testing

### Manual Testing

1. Start dev server: `npm run dev`
2. Test in browser: http://localhost:3000
3. Use test accounts (see SETUP.md)
4. Test both passenger and driver flows

### API Testing

Use curl or Postman:

```bash
# Login
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"sarah@rideshare.com","password":"password123"}'

# Request ride
curl -X POST http://localhost:3000/api/rides/request \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"pickup":{...},"dropoff":{...},...}'
```

## Pull Request Process

1. Update README if needed
2. Update API.md if adding/changing endpoints
3. Ensure TypeScript passes: `npm run lint`
4. Commit with conventional message
5. Push to your fork
6. Open PR with:
   - Clear title
   - Description of changes
   - Related issues (if any)
   - Screenshots (if UI changes)

### PR Template

```markdown
## Description
Brief description of changes

## Type of Change
- [ ] New feature
- [ ] Bug fix
- [ ] Breaking change
- [ ] Documentation update

## Related Issues
Fixes #123

## Testing
How to test these changes

## Screenshots (if applicable)
[Screenshot descriptions]
```

## Architecture Guidelines

### Frontend Components

```typescript
// Keep components focused and reusable
interface ComponentProps {
  title: string;
  onAction: () => void;
  isLoading?: boolean;
}

export function MyComponent({ title, onAction, isLoading }: ComponentProps) {
  return <div>...</div>;
}
```

### Backend Routes

```typescript
// Follow RESTful conventions
app.get('/api/resource', authenticateToken, (req, res) => {
  // GET /resource - List
});

app.post('/api/resource', authenticateToken, (req, res) => {
  // POST /resource - Create
});

app.put('/api/resource/:id', authenticateToken, (req, res) => {
  // PUT /resource/:id - Update
});

app.delete('/api/resource/:id', authenticateToken, (req, res) => {
  // DELETE /resource/:id - Delete
});
```

### Adding Dependencies

Before adding new packages:

1. Check if already installed
2. Justify why it's needed
3. Consider bundle size impact
4. Update package.json with reason

```json
{
  "dependencies": {
    "new-package": "^1.0.0" // Used for: description
  }
}
```

## Documentation

### Updating API.md

When adding endpoints:

1. Add to appropriate section
2. Include request/response examples
3. Document all parameters
4. List status codes

### Code Comments

```typescript
// Use JSDoc for public functions
/**
 * Calculate distance between two coordinates
 * @param lat1 Starting latitude
 * @param lng1 Starting longitude
 * @param lat2 Ending latitude
 * @param lng2 Ending longitude
 * @returns Distance in kilometers
 */
function calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  // implementation
}
```

## Performance Considerations

- Keep database queries efficient
- Minimize re-renders with React.memo
- Use proper TypeScript typing for type safety
- Profile bundle size: `npm run build`
- Use DevOps dashboard to monitor

## Security

- Always validate user input
- Use JWT for authentication
- Hash passwords with bcryptjs
- Sanitize error messages
- Never expose sensitive data
- Use HTTPS in production

## Questions?

1. Check existing issues/PRs
2. Review documentation files
3. Ask in PR comments
4. Email maintainer

## Code of Conduct

- Be respectful
- Provide constructive feedback
- Help others
- Report issues professionally

Thank you for contributing! 🎉
