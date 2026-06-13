#!/bin/bash

# Deploy email_processor.js to ReadyTMS
# Adds equipment auto-add functionality

READYTMS_SERVER="/tmp/readytms/server"
MONITOR_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

echo "🚀 Deploying email_processor.js to ReadyTMS..."
echo ""

# Check if server directory exists
if [ ! -d "$READYTMS_SERVER" ]; then
    echo "❌ ReadyTMS server not found at $READYTMS_SERVER"
    echo "Please check the path and try again"
    exit 1
fi

# Copy email_processor.js
echo "📋 Copying email_processor.js..."
cp "$MONITOR_DIR/email_processor.js" "$READYTMS_SERVER/email_processor.js"
echo "✅ Copied to $READYTMS_SERVER/email_processor.js"
echo ""

# Update routes.ts
ROUTES_FILE="$READYTMS_SERVER/routes.ts"

if [ ! -f "$ROUTES_FILE" ]; then
    echo "❌ routes.ts not found at $ROUTES_FILE"
    exit 1
fi

echo "📝 Updating routes.ts..."

# Check if import already exists
if ! grep -q "emailProcessorRoute\|email_processor" "$ROUTES_FILE"; then
    echo "Adding import statement..."
    # Find the last import line and add after it
    LAST_IMPORT_LINE=$(grep -n "^import\|^export" "$ROUTES_FILE" | tail -1 | cut -d: -f1)

    if [ -z "$LAST_IMPORT_LINE" ]; then
        # No imports found, add at top
        sed -i '1s/^/import { emailProcessorRoute } from ".\/email_processor.js";\n/' "$ROUTES_FILE"
    else
        # Add after last import
        sed -i "${LAST_IMPORT_LINE}a import { emailProcessorRoute } from \"./email_processor.js\";" "$ROUTES_FILE"
    fi
    echo "✅ Import added"
else
    echo "⏭️ Import already exists"
fi

# Check if route already exists
if ! grep -q "/api/email/process\|emailProcessorRoute" "$ROUTES_FILE"; then
    echo "Adding route..."
    # Find a good place to add the route (after other app.post lines)
    LAST_ROUTE_LINE=$(grep -n "app\.post\|app\.get" "$ROUTES_FILE" | tail -1 | cut -d: -f1)

    if [ -z "$LAST_ROUTE_LINE" ]; then
        echo "❌ Could not find where to add route in routes.ts"
        echo "Please add manually:"
        echo "  app.post('/api/email/process', emailProcessorRoute);"
    else
        # Add route after last app.post/app.get
        sed -i "${LAST_ROUTE_LINE}a app.post('/api/email/process', emailProcessorRoute);" "$ROUTES_FILE"
        echo "✅ Route added"
    fi
else
    echo "⏭️ Route already exists"
fi

echo ""
echo "✅ Deployment complete!"
echo ""
echo "📍 Files updated:"
echo "   • $READYTMS_SERVER/email_processor.js"
echo "   • $READYTMS_SERVER/routes.ts"
echo ""
echo "🔧 Next steps:"
echo "   1. Add environment variables to ReadyTMS:"
echo "      TELEGRAM_BOT_TOKEN=8871488327:AAFgpbfMFPe_KqTUV_8xjPy2I7T5C0Fmmkc"
echo "      TELEGRAM_CHAT_ID=-5240100622"
echo "   2. Redeploy to Replit"
echo "   3. Test: curl -X POST http://localhost:3000/api/email/process -H 'Content-Type: application/json' -d '{\"subject\":\"Test\",\"sender\":\"info@readycarrier.com\",\"body\":\"Add truck 999\"}'"
echo ""
