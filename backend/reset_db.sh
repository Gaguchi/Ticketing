#!/bin/bash
# Database Reset Script for Development
# This script resets the database and optionally creates a superuser

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Parse arguments
CREATE_SUPERUSER=false
LOAD_FIXTURES=false
NO_INPUT=false

while [[ $# -gt 0 ]]; do
    case $1 in
        --create-superuser)
            CREATE_SUPERUSER=true
            shift
            ;;
        --load-fixtures)
            LOAD_FIXTURES=true
            shift
            ;;
        --no-input)
            NO_INPUT=true
            shift
            ;;
        *)
            echo -e "${RED}Unknown option: $1${NC}"
            echo "Usage: $0 [--create-superuser] [--load-fixtures] [--no-input]"
            exit 1
            ;;
    esac
done

echo -e ""
echo -e "${CYAN}🔄 Database Reset Utility${NC}"
echo -e "${CYAN}=========================${NC}"
echo -e ""

# Build the command
COMMAND="python manage.py reset_db"

if [ "$CREATE_SUPERUSER" = true ]; then
    COMMAND="$COMMAND --create-superuser"
fi

if [ "$LOAD_FIXTURES" = true ]; then
    COMMAND="$COMMAND --load-fixtures"
fi

if [ "$NO_INPUT" = true ]; then
    COMMAND="$COMMAND --no-input"
fi

# Execute the command
echo -e "${YELLOW}Executing: $COMMAND${NC}"
echo -e ""

eval $COMMAND

echo -e ""
echo -e "${GREEN}Done!${NC}"
