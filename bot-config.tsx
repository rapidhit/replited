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

              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
