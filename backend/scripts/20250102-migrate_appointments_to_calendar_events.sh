#!/bin/bash

# Migration script to create CalendarEvent records for existing approved appointments
# Run this script from the backend directory

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$(dirname "$SCRIPT_DIR")"

echo "=========================================="
echo "Migrating Appointments to Calendar Events"
echo "=========================================="
echo "Script directory: $SCRIPT_DIR"
echo "Backend directory: $BACKEND_DIR"
echo

# Change to backend directory
cd "$BACKEND_DIR"

# Check if virtual environment exists and activate it
if [ -d ".venv" ]; then
    echo "Activating virtual environment..."
    source .venv/bin/activate
else
    echo "Warning: No .venv directory found. Make sure you have the correct Python environment."
fi

# Set PYTHONPATH to include the backend directory
export PYTHONPATH="$BACKEND_DIR:$PYTHONPATH"

# First run a dry-run to show what will be migrated
echo "=========================================="
echo "DRY RUN - Showing what will be migrated:"
echo "=========================================="
python scripts/migrate_appointments_to_calendar_events.py --dry-run

echo
echo "=========================================="
echo "Do you want to proceed with the migration? (y/N)"
read -r response
if [[ ! "$response" =~ ^([yY][eE][sS]|[yY])$ ]]; then
    echo "Migration cancelled."
    exit 0
fi

echo "=========================================="
echo "Running actual migration..."
echo "=========================================="
python scripts/migrate_appointments_to_calendar_events.py --batch-size=50

echo
echo "=========================================="
echo "Migration completed!"
echo "=========================================="
echo "Check the logs above for any errors."
echo "You can verify the migration by checking that appointments now have calendar_event_id values." 