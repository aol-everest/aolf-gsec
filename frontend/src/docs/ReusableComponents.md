# Reusable Components

This document provides an overview of the reusable components available in the application.

## Table of Contents

1. [EnumSelect](#enumselect)
2. [FilterChip](#filterchip)
3. [FilterChipGroup](#filterchipgroup)

## EnumSelect

`EnumSelect` is a reusable select component that fetches and displays enum values from the backend.

### Usage

```tsx
import { EnumSelect } from '../components/EnumSelect';
import { Controller } from 'react-hook-form';

// With React Hook Form
<Controller
  name="status"
  control={control}
  render={({ field }) => (
    <EnumSelect
      enumType="appointmentStatus"
      label="Status"
      {...field}
    />
  )}
/>

// Without React Hook Form
const [status, setStatus] = useState('');

<EnumSelect
  enumType="appointmentStatus"
  label="Status"
  value={status}
  onChange={(e) => setStatus(e.target.value)}
  required
/>
```

### Props

| Prop | Type | Description |
|------|------|-------------|
| `enumType` | `EnumType` | The type of enum to fetch from the backend |
| `label` | `string` | The label for the select field |
| `error` | `boolean` | Whether the field has an error |
| `helperText` | `string` | Helper text to display below the field |
| `required` | `boolean` | Whether the field is required |
| `fullWidth` | `boolean` | Whether the field should take up the full width |
| `...selectProps` | `SelectProps` | Any other props to pass to the MUI Select component |

## FilterChip

`FilterChip` is a reusable chip component for filtering data.

### Usage

```tsx
import { FilterChip } from '../components/FilterChip';

const [selectedStatus, setSelectedStatus] = useState<string | null>(null);

<FilterChip
  label="Approved"
  value="Approved"
  selectedValue={selectedStatus}
  count={5}
  getColor={(value, theme) => theme.palette.success.main}
  onToggle={(value) => setSelectedStatus(value === selectedStatus ? null : value)}
/>
```

### Props

| Prop | Type | Description |
|------|------|-------------|
| `label` | `string` | The label to display on the chip |
| `value` | `string \| number` | The value associated with this chip |
| `selectedValue` | `string \| number \| null` | The currently selected value |
| `count` | `number` | Count to display next to the label |
| `getColor` | `(value: string \| number, theme: Theme) => string` | Function to get the color for the chip based on its value |
| `onToggle` | `(value: string \| number) => void` | Callback when the chip is clicked |
| `icon` | `React.ReactElement` | Icon to display on the chip |
| `...chipProps` | `ChipProps` | Any other props to pass to the MUI Chip component |

## FilterChipGroup

`FilterChipGroup` is a group of filter chips with a common toggle handler.

### Usage

```tsx
import { FilterChipGroup } from '../components/FilterChip';

const [selectedStatus, setSelectedStatus] = useState<string | null>(null);
const statusOptions = ['Pending', 'Approved', 'Rejected'];

<FilterChipGroup
  options={statusOptions}
  selectedValue={selectedStatus}
  getLabel={(status) => status}
  getCount={(status) => appointments.filter(a => a.status === status).length}
  getColor={(status, theme) => {
    switch (status) {
      case 'Approved': return theme.palette.success.main;
      case 'Rejected': return theme.palette.error.main;
      default: return theme.palette.warning.main;
    }
  }}
  onToggle={(value) => setSelectedStatus(value)}
/>
```

### Props

| Prop | Type | Description |
|------|------|-------------|
| `options` | `T[]` | Array of option values |
| `selectedValue` | `T \| null` | Currently selected value |
| `getLabel` | `(option: T) => string` | Function to get the label for an option |
| `getCount` | `(option: T) => number` | Function to get the count for an option |
| `getColor` | `(option: T, theme: Theme) => string` | Function to get the color for an option |
| `onToggle` | `(value: T \| null) => void` | Callback when an option is toggled |
| `getIcon` | `(option: T) => React.ReactElement \| undefined` | Function to get the icon for an option |
| `...chipProps` | `ChipProps` | Any other props to pass to the MUI Chip component |

## Best Practices

1. **Use EnumSelect for form fields**: When you need a select field that uses enum values from the backend, use `EnumSelect` instead of manually fetching the values.

2. **Use FilterChip for single filters**: When you need a single filter chip, use `FilterChip`.

3. **Use FilterChipGroup for multiple filters**: When you need multiple filter chips with the same behavior, use `FilterChipGroup`.

4. **Provide meaningful labels and counts**: Always provide meaningful labels and counts to help users understand what they're filtering.

5. **Use appropriate colors**: Use colors that match your application's theme and provide good contrast for readability.

## Additional Components to Consider

Here are some additional reusable components that could be useful:

1. **DateRangePicker**: A component for selecting a date range.

2. **SearchInput**: A component for searching with debounce functionality.

3. **SortableTable**: A component for displaying tabular data with sorting capabilities.

4. **Pagination**: A component for paginating through large datasets.

5. **FileUpload**: A component for uploading files with preview and progress indicators. 