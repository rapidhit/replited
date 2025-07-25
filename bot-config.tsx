import { Bot, CheckCircle, AlertCircle, Loader2 } from "lucide-react";

const botSchema = z.object({
  token: z.string().min(1, "Bot token is required").regex(/^\d+:[A-Za-z0-9_-]+$/, "Invalid bot token format"),
});
  const form = useForm<BotForm>({
    resolver: zodResolver(botSchema),
    defaultValues: {
      token: "",
    },
  });
import { Bot, CheckCircle, AlertCircle, Loader2 } from "lucide-react";

const botSchema = z.object({
  token: z.string().min(1, "Bot token is required").regex(/^\d+:[A-Za-z0-9_-]+$/, "Invalid bot token format"),
});

type BotForm = z.infer<typeof botSchema>;

export default function BotConfig() {
  const { toast } = useToast();
  const [validatingToken, setValidatingToken] = useState(false);

  const { data: bots, isLoading } = useQuery({
    queryKey: ['/api/bots'],
    queryFn: () => getAllBots(),
  });

  const createBotMutation = useMutation({
    mutationFn: createBot,
    onSuccess: (bot) => {
      toast({
        title: "Bot configured successfully!",
        description: `Bot @${bot.username} is now active and ready to send messages.`,
      });
      queryClient.invalidateQueries({ queryKey: ['/api/bots'] });
      queryClient.invalidateQueries({ queryKey: ['/api/bots/active'] });
      form.reset();
    },
    onError: (error: any) => {
      toast({
        title: "Failed to configure bot",
        description: error.message || "Please check your bot token and try again.",
        variant: "destructive",
      });
    },
  });

  const form = useForm<BotForm>({
    resolver: zodResolver(botSchema),
    defaultValues: {
      token: "",
    },
  });

  const onSubmit = async (data: BotForm) => {
    setValidatingToken(true);
    
    try {
      await createBotMutation.mutateAsync(data);
    } finally {
      setValidatingToken(false);
    }
  };

  const activeBots = bots?.filter(bot => bot.isActive) || [];
  const inactiveBots = bots?.filter(bot => !bot.isActive) || [];

  return (
    <div>
      <Header 
        title="Bot Configuration" 
        description="Configure your Telegram bot to start sending messages"
      />
      
      <main className="p-6">
        <div className="max-w-4xl mx-auto space-y-8">
          {/* Bot Setup Form */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Bot className="h-5 w-5" />
                <span>Add New Bot</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Alert className="mb-6">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  To get a bot token, message <strong>@BotFather</strong> on Telegram and create a new bot. 
                  Copy the token and paste it below.
                </AlertDescription>
              </Alert>

              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  <FormField
                    control={form.control}
                    name="token"
