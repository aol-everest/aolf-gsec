# Using Enums in the Frontend

This document explains how to use backend-provided enums in the frontend application.

## Background

Previously, we had hardcoded enum values in `formConstants.ts` that duplicated the backend's enum definitions. This approach led to potential inconsistencies when the backend enums changed.

The new approach fetches enum values directly from the backend API, ensuring that the frontend always uses the most up-to-date values.

## How to Use Enums

### 1. Using the `useEnums` Hook

The `useEnums` hook provides a simple way to fetch enum values from the backend:

```tsx
import { useEnums } from '../hooks/useEnums';

function MyComponent() {
  const { values, isLoading, error } = useEnums('honorificTitle');
  
  if (isLoading) return <CircularProgress />;
  if (error) return <Alert severity="error">Failed to load honorific titles</Alert>;
  
  return (
    <div>
      {values.map(title => (
        <div key={title}>{title}</div>
      ))}
    </div>
  );
}
```

Available enum types:
- `'honorificTitle'`
- `'primaryDomain'`
- `'relationshipType'`
- `'appointmentStatus'`
- `'appointmentSubStatus'`
- `'appointmentType'`
- `'timeOfDay'`

### 2. Using the `EnumSelect` Component

For form selects, you can use the `EnumSelect` component:

```tsx
import { EnumSelect } from '../components/EnumSelect';

function MyForm() {
  const [honorificTitle, setHonorificTitle] = useState('');
  
  return (
    <EnumSelect
      enumType="honorificTitle"
      label="Honorific Title"
      value={honorificTitle}
      onChange={(e) => setHonorificTitle(e.target.value)}
      required
    />
  );
}
```

### 3. Type Definitions

In your TypeScript interfaces, use the exported type definitions:

```tsx
import { HonorificTitle, PrimaryDomain, RelationshipType } from '../types/appointment';

interface MyInterface {
  title: HonorificTitle;
  domain: PrimaryDomain;
  relationship: RelationshipType;
}
```

## Benefits

1. **Single Source of Truth**: Enum values are defined only in the backend
2. **Automatic Updates**: When backend enums change, the frontend automatically gets the updated values
3. **Type Safety**: TypeScript types ensure correct usage of enum values
4. **Caching**: Enum values are cached using React Query to minimize API calls

## API Endpoints

The following API endpoints provide enum values:

- `/dignitaries/honorific-title-options`
- `/dignitaries/primary-domain-options`
- `/dignitaries/relationship-type-options`
- `/appointments/status-options`
- `/appointments/sub-status-options`
- `/appointments/type-options`
- `/appointments/time-of-day-options` 