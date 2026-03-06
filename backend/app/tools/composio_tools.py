"""
Composio Tool Integration for Savant

Uses Composio Tool Router MCP to provide GA4 + GSC tools to Agno agents.
Composio handles OAuth, token refresh, and tool execution.
Agno's MCPTools handles MCP -> Function conversion natively.
"""

from agno.tools.mcp import MCPTools, StreamableHTTPClientParams
import os
import logging
from typing import Optional

logger = logging.getLogger(__name__)

# Curated tool lists (subset of 75 GA4 + 9 GSC tools)
GA4_TOOLS = [
    "GOOGLE_ANALYTICS_RUN_REPORT",
    "GOOGLE_ANALYTICS_RUN_REALTIME_REPORT",
    "GOOGLE_ANALYTICS_BATCH_RUN_REPORTS",
    "GOOGLE_ANALYTICS_RUN_FUNNEL_REPORT",
    "GOOGLE_ANALYTICS_LIST_ACCOUNT_SUMMARIES",
    "GOOGLE_ANALYTICS_LIST_PROPERTIES",
    "GOOGLE_ANALYTICS_GET_PROPERTY",
    "GOOGLE_ANALYTICS_GET_METADATA",
    "GOOGLE_ANALYTICS_CHECK_COMPATIBILITY",
    "GOOGLE_ANALYTICS_LIST_KEY_EVENTS",
]

GSC_TOOLS = [
    "GOOGLE_SEARCH_CONSOLE_SEARCH_ANALYTICS_QUERY",
    "GOOGLE_SEARCH_CONSOLE_LIST_SITES",
    "GOOGLE_SEARCH_CONSOLE_GET_SITE",
    "GOOGLE_SEARCH_CONSOLE_INSPECT_URL",
    "GOOGLE_SEARCH_CONSOLE_LIST_SITEMAPS",
]

COMPOSIO_TOOLKITS = {
    "google_analytics": {"tools": GA4_TOOLS, "app": "GOOGLE_ANALYTICS"},
    "google_search_console": {"tools": GSC_TOOLS, "app": "GOOGLE_SEARCH_CONSOLE"},
}

_composio_client = None


def get_composio_client():
    global _composio_client
    if _composio_client is None:
        from composio import Composio
        _composio_client = Composio(api_key=os.getenv("COMPOSIO_API_KEY"))
    return _composio_client


def check_user_google_connection(user_id: str) -> bool:
    """Check if user has active Google connections via Composio."""
    try:
        composio = get_composio_client()
        connections = composio.connected_accounts.list(
            user_ids=[user_id],
            statuses=["ACTIVE"],
        )
        return len(connections.items) > 0
    except Exception as e:
        logger.warning(f"Failed to check Composio connection for user {user_id}: {e}")
        return False


def get_connection_url(user_id: str, redirect_url: str) -> str:
    """Generate Google OAuth connection URL for a user."""
    composio = get_composio_client()
    auth_config_id = os.getenv("COMPOSIO_AUTH_CONFIG_ID")
    if not auth_config_id:
        raise ValueError("COMPOSIO_AUTH_CONFIG_ID environment variable not set")
    connection = composio.connected_accounts.initiate(
        user_id=user_id,
        auth_config_id=auth_config_id,
        callback_url=redirect_url,
    )
    return connection.redirect_url


def create_composio_mcp_tools(user_id: str, toolkit_names: list[str]) -> MCPTools:
    """Create Agno MCPTools connected to user's Composio tool router MCP.

    Composio's tool router exposes meta-tools (COMPOSIO_SEARCH_TOOLS,
    COMPOSIO_MULTI_EXECUTE_TOOL, etc.) that the agent uses to discover
    and execute GA4/GSC actions dynamically. We don't filter tools since
    all meta-tools are needed for the agent to work.
    """
    composio = get_composio_client()

    # Create a per-user tool router session
    session = composio.create(user_id=user_id)

    # Get MCP URL and auth headers from session
    mcp_url = session.mcp.url
    mcp_headers = session.mcp.headers

    logger.info(f"Creating Composio MCP tools for user {user_id}: toolkits={toolkit_names}, session={session.session_id}")

    # Use StreamableHTTPClientParams to pass auth headers (Composio uses HTTP transport)
    server_params = StreamableHTTPClientParams(
        url=mcp_url,
        headers=mcp_headers,
    )

    return MCPTools(
        server_params=server_params,
        transport="streamable-http",
        timeout_seconds=30,
    )
