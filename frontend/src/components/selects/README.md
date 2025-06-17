# Select Components

This folder contains all reusable select/dropdown components used throughout the application.

## Architecture Principles

### **Data Fetching Strategy**

We use two different patterns based on the component's purpose:

#### **1. Domain-Specific Components (Internal Data Fetching)**
Components that are specific to a particular business domain fetch their own data using `useEnums` hook.

**Examples:**
- `PrimaryDomainSelect` - Fetches primary domain options
- `HonorificTitleSelect` - Fetches honorific title options

**Benefits:**
- ✅ Single source of truth for domain logic
- ✅ Automatic caching via React Query
- ✅ Centralized API management
- ✅ Simpler consumer API

**Usage:**
```typescript
<PrimaryDomainSelect
  label="Primary Domain"
  value={value}
  onChange={onChange}
  required
/>
```

#### **2. Custom Implementation Components (External Data)**
Components with specialized UX requirements that don't fit the generic pattern.

**Examples:**
- `CountrySelect` - Custom country display with chips and grouping
- `SubdivisionStateDropdown` - Custom state/province selector with country dependency
- `GenericSelect` - Base component for all selects

**Benefits:**
- ✅ Specialized UX for specific use cases
- ✅ Custom display logic and formatting
- ✅ Optimized for domain-specific needs

**Usage:**
```typescript
<CountrySelect
  countries={countries}
  loading={isLoading}
  value={value}
  onChange={onChange}
/>

<SubdivisionStateDropdown
  label="State/Province"
  value={value}
  onChange={onChange}
  countryCode={selectedCountryCode}
/>
```

## Component Hierarchy

```
GenericSelect (Base Component)
├── GenericSimpleSelect (Simple wrapper - no priority grouping)
├── HonorificTitleSelect (Domain-specific with internal data fetching)
├── PrimaryDomainSelect (Domain-specific with internal data fetching)
├── CountrySelect (Custom implementation with external data)
└── SubdivisionStateDropdown (Custom implementation with external data + country dependency)
```

## Creating New Select Components

### **For Domain-Specific Data:**
1. Create component that uses `useEnums('yourDomain')`
2. Define priority items if needed
3. Use `GenericSelect` as the base

```typescript
export const YourDomainSelect: React.FC<Props> = ({ ...props }) => {
  const { values: options, isLoading } = useEnums('yourDomain');
  
  const priorityOptions = ['Common', 'Option', 'List'];
  
  return (
    <GenericSelect
      options={options}
      priorityOptions={priorityOptions}
      loading={isLoading}
      {...props}
    />
  );
};
```

### **For Generic/Reusable Data:**
1. Accept data as props
2. Use `GenericSelect` as the base
3. Add domain-specific formatting if needed

```typescript
export const YourGenericSelect: React.FC<Props> = ({ 
  data, 
  loading, 
  ...props 
}) => {
  return (
    <GenericSelect
      options={data}
      loading={loading}
      {...props}
    />
  );
};
```

## Features

All select components support:
- ✅ **Search/Filter**: Type to search options
- ✅ **Priority Grouping**: Common options appear first with visual indicators
- ✅ **Loading States**: Proper loading indicators
- ✅ **Error Handling**: Error states and messages
- ✅ **Accessibility**: Full keyboard navigation and screen reader support
- ✅ **Validation**: Form validation integration
- ✅ **Customization**: Labels, placeholders, help text

## Best Practices

1. **Use domain-specific components** when data source is unlikely to change
2. **Use generic components** when flexibility is needed
3. **Always define priority options** for better UX
4. **Include proper loading and error states**
5. **Follow consistent naming**: `[Domain]Select` for specific, `Generic[Type]Select` for reusable
6. **Document priority logic** in component comments

## Migration Notes

When updating existing `EnumSelect` usages:
1. Identify if it's domain-specific or generic
2. Choose appropriate pattern
3. Update imports
4. Remove manual data fetching if using domain-specific pattern
5. Test loading and error states 