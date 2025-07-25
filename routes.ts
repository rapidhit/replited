
      const bot = await storage.createBot({
        ...botData,
        name: validation.botInfo!.first_name,
        username: validation.botInfo!.username,
      });

      broadcastUpdate({
        type: 'bot_connected',
        bot: bot
      });

      res.json(bot);
    } catch (error) {
      res.status(400).json({ message: error instanceof Error ? error.message : 'Invalid bot data' });
    }
  });

  app.get("/api/bots", async (req, res) => {
    const bots = await storage.getAllBots();
    res.json(bots);
  });

  app.get("/api/bots/active", async (req, res) => {
    const bots = await storage.getAllBots();
    const activeBot = bots.find(bot => bot.isActive);
    
    if (!activeBot) {
      return res.json(null);
    }

    // Get active user count and other stats
    const recipients = await storage.getActiveRecipients();
    const recentMessages = await storage.getRecentMessages(10);
    
    res.json({
      bot: activeBot,
      stats: {
        activeUsers: recipients.length,
        totalRecipients: recipients.length,
        recentMessages: recentMessages.length
      }
    });
  });

  // Recipient management routes
  app.post("/api/recipients", async (req, res) => {
    try {
      const recipientData = insertRecipientSchema.parse(req.body);
      
      // Check if recipient already exists
      const existing = await storage.getRecipientByUserId(recipientData.userId);
      if (existing) {
        return res.status(400).json({ message: 'Recipient already exists' });
      }

      // Validate with active bot
      const bots = await storage.getAllBots();
      const activeBot = bots.find(bot => bot.isActive);
      
      if (activeBot) {
        const telegramService = createTelegramService(activeBot.token);
        const memberCheck = await telegramService.getChatMember(recipientData.userId, parseInt(recipientData.userId));
        
        if (!memberCheck.success) {
          recipientData.isActive = false;
        }
      }

      const recipient = await storage.createRecipient(recipientData);
      
      broadcastUpdate({
        type: 'recipient_added',
        recipient: recipient
      });

      res.json(recipient);
    } catch (error) {
      res.status(400).json({ message: error instanceof Error ? error.message : 'Invalid recipient data' });
    }
  });

  app.get("/api/recipients", async (req, res) => {
    const recipients = await storage.getAllRecipients();
    res.json(recipients);
  });

  app.put("/api/recipients/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const updates = req.body;
      const recipient = await storage.updateRecipient(id, updates);
      
      if (!recipient) {
        return res.status(404).json({ message: 'Recipient not found' });
      }

      res.json(recipient);
    } catch (error) {
      res.status(400).json({ message: error instanceof Error ? error.message : 'Invalid data' });
    }
  });

  // Message routes
  app.post("/api/messages", async (req, res) => {
    try {
      const messageData = insertMessageSchema.parse(req.body);
      const message = await storage.createMessage(messageData);
      res.json(message);
    } catch (error) {
      res.status(400).json({ message: error instanceof Error ? error.message : 'Invalid message data' });
    }
  });

  app.get("/api/messages", async (req, res) => {
    const messages = await storage.getAllMessages();
    res.json(messages);
  });

  app.get("/api/messages/recent", async (req, res) => {
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;
    const messages = await storage.getRecentMessages(limit);
    res.json(messages);
  });

  app.post("/api/messages/:id/send", async (req, res) => {
    try {
      const messageId = parseInt(req.params.id);
      const message = await storage.getMessage(messageId);
      
      if (!message) {
        return res.status(404).json({ message: 'Message not found' });
      }

      const recipients = await storage.getActiveRecipients();
      
      if (recipients.length === 0) {
        return res.status(400).json({ message: 'No active recipients found' });
      }

      // Update message status and counts
      await storage.updateMessage(messageId, {
        status: 'sending',
        recipientCount: recipients.length,
        sentAt: new Date()
      });

      // Create delivery records
      for (const recipient of recipients) {
        await storage.createMessageDelivery({
          messageId,
          recipientId: recipient.id,
          status: 'pending'
        });

        // Add to rate-limited queue
        rateLimiter.addToQueue({
          messageId,
          recipientId: recipient.id,
          chatId: recipient.userId,
          content: {
            text: message.text,
            imageUrl: message.imageUrl || undefined,
            buttonText: message.buttonText || undefined,
            buttonUrl: message.buttonUrl || undefined
          }
        });
      }

      broadcastUpdate({
        type: 'message_sending_started',
        messageId: messageId,
        recipientCount: recipients.length
      });

      res.json({ success: true, recipientCount: recipients.length });
    } catch (error) {
      res.status(500).json({ message: error instanceof Error ? error.message : 'Failed to send message' });
    }
  });

  // File upload route
  app.post("/api/upload", upload.single('image'), (req: Request, res) => {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    const fileUrl = `/uploads/${req.file.filename}`;
    res.json({ url: fileUrl });
  });

  // Serve uploaded files
  app.use('/uploads', express.static('uploads'));

  // Template routes
  app.post("/api/templates", async (req, res) => {
    try {
      const templateData = insertTemplateSchema.parse(req.body);
      const template = await storage.createTemplate(templateData);
      res.json(template);
    } catch (error) {
      res.status(400).json({ message: error instanceof Error ? error.message : 'Invalid template data' });
    }
  });

  app.get("/api/templates", async (req, res) => {
    const templates = await storage.getAllTemplates();
    res.json(templates);
  });

  app.put("/api/templates/:id/use", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const template = await storage.getTemplate(id);
      
      if (!template) {
        return res.status(404).json({ message: 'Template not found' });
      }

      await storage.updateTemplate(id, {
        usageCount: (template.usageCount || 0) + 1
      });

      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ message: error instanceof Error ? error.message : 'Failed to update template' });
    }
  });

  // Analytics routes
  app.get("/api/analytics/stats", async (req, res) => {
    const recipients = await storage.getAllRecipients();
    const messages = await storage.getAllMessages();
    const activeRecipients = recipients.filter(r => r.isActive && !r.isBlocked);
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const todaysMessages = messages.filter(m => 
      m.sentAt && new Date(m.sentAt) >= today
    );

    const totalSent = todaysMessages.reduce((sum, m) => sum + (m.sentCount || 0), 0);
    const totalDelivered = todaysMessages.reduce((sum, m) => sum + (m.deliveredCount || 0), 0);
    const totalRead = todaysMessages.reduce((sum, m) => sum + (m.readCount || 0), 0);

    res.json({
      activeUsers: activeRecipients.length,
      messagesSentToday: totalSent,
      deliveryRate: totalSent > 0 ? ((totalDelivered / totalSent) * 100).toFixed(1) : '0.0',
      readRate: totalDelivered > 0 ? ((totalRead / totalDelivered) * 100).toFixed(1) : '0.0',
      totalRecipients: recipients.length,
      blockedUsers: recipients.filter(r => r.isBlocked).length
    });
  });

  const httpServer = createServer(app);

  // WebSocket setup
  wss = new WebSocketServer({ server: httpServer, path: '/ws' });

  wss.on('connection', (ws) => {
    connectedClients.add(ws);

    ws.on('close', () => {
      connectedClients.delete(ws);
    });

    ws.on('error', (error) => {
      console.error('WebSocket error:', error);
      connectedClients.delete(ws);
    });

    // Send initial data
    ws.send(JSON.stringify({
      type: 'connected',
      message: 'WebSocket connected'
    }));
  });

  return httpServer;
}
