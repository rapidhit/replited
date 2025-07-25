export const insertBotSchema = createInsertSchema(bots).omit({
  id: true,
  createdAt: true,
  name: true,
  username: true,
});

export const insertRecipientSchema = createInsertSchema(recipients).omit({
  id: true,
  createdAt: true,
});

export const insertMessageSchema = createInsertSchema(messages).omit({
  id: true,
  createdAt: true,
  sentAt: true,
  recipientCount: true,
  sentCount: true,
  deliveredCount: true,
  readCount: true,
  failedCount: true,
});

export const insertMessageDeliverySchema = createInsertSchema(messageDeliveries).omit({
  id: true,
  createdAt: true,
});

export const insertTemplateSchema = createInsertSchema(templates).omit({
  id: true,
  createdAt: true,
  usageCount: true,
});

export type Bot = typeof bots.$inferSelect;
export type InsertBot = z.infer<typeof insertBotSchema>;
export type Recipient = typeof recipients.$inferSelect;
export type InsertRecipient = z.infer<typeof insertRecipientSchema>;
export type Message = typeof messages.$inferSelect;
export type InsertMessage = z.infer<typeof insertMessageSchema>;
export type MessageDelivery = typeof messageDeliveries.$inferSelect;
export type InsertMessageDelivery = z.infer<typeof insertMessageDeliverySchema>;
export type Template = typeof templates.$inferSelect;
export type InsertTemplate = z.infer<typeof insertTemplateSchema>;
