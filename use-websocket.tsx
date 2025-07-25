  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    // Delay WebSocket connection to ensure server is ready
    const timer = setTimeout(() => {
      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      const wsUrl = `${protocol}//${window.location.host}/ws`;
      
      const connectWebSocket = () => {
        try {
          const ws = new WebSocket(wsUrl);
          wsRef.current = ws;

          ws.onopen = () => {
            setIsConnected(true);
          };

          ws.onmessage = (event) => {
            try {
              const message = JSON.parse(event.data);
              setLastMessage(message);
              if (onMessage) {
                onMessage(message);
              }
            } catch (error) {
              console.error('Failed to parse WebSocket message:', error);
            }
          };

          ws.onclose = (event) => {
            setIsConnected(false);
            // Only reconnect if it wasn't a clean close and we're still mounted
            if (event.code !== 1000 && wsRef.current) {
              setTimeout(() => {
                if (wsRef.current) {
                  connectWebSocket();
                }
              }, 5000);
            }
          };

          ws.onerror = () => {
            setIsConnected(false);
          };
        } catch (error) {
          setIsConnected(false);
        }
      };

      connectWebSocket();
    }, 1000);

    return () => {
      clearTimeout(timer);
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [onMessage]);

  const sendMessage = (message: any) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
    }
  };

  return {
    isConnected,
    lastMessage,
    sendMessage
  };
}
