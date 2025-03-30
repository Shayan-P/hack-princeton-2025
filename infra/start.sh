SCRIPT_PATH="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

sudo nginx -c $SCRIPT_PATH/nginx.conf
