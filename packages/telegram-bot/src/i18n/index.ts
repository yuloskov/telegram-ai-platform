const messages = {
  en: {
    welcome: "Welcome to the AI Telegram Channels Platform!",
    welcomeDescription:
      "I help you manage your Telegram channels with AI-powered content generation.",
    loginPrompt:
      "To get started, send me your authentication code from the web app.",
    loginSuccess: "You have been successfully authenticated!",
    loginFailed: "Authentication failed. The code may be invalid or expired.",
    loginExpired: "This code has expired. Please generate a new one.",
    loginAlreadyUsed: "This code has already been used.",
    codeInvalid: "Invalid code format. Please enter a 6-character code.",
    statusOverview: "Your channels overview:",
    noChannels: "You don't have any channels yet. Add one from the web app!",
    channelsList: "Your channels:",
    pendingPosts: "Pending posts for review:",
    noPendingPosts: "No posts pending review.",
    languageChanged: "Language changed to English.",
    helpTitle: "Available commands:",
    helpCommands: `
/start - Welcome message and help
/login - Generate authentication code
/status - Overview of your channels
/channels - List your managed channels
/pending - View posts awaiting review
/lang - Switch language (English/Russian)
/help - Show this help message`,
    publishSuccess: "Post published successfully!",
    publishFailed: "Failed to publish post:",
    reviewPost: "New post ready for review:",
    reviewButtons: {
      approve: "Approve",
      edit: "Edit",
      reject: "Reject",
      schedule: "Schedule",
    },
    approved: "Post approved and published!",
    rejected: "Post rejected.",
    scheduled: "Post scheduled.",
    errorOccurred: "An error occurred. Please try again.",
    notAuthenticated: "Please authenticate first using a code from the web app.",
    scrapingComplete: "Scraping completed! Found {count} new posts.",
    channelAdded: "Channel '{title}' has been added successfully!",
    channelRemoved: "Channel has been removed.",
    // Review edit flow
    reviewEditMode: "Edit mode",
    reviewEditInstructions: "You can edit the text or regenerate the image for this post.",
    editTextButton: "Edit Text",
    regenerateImageButton: "Regenerate Image",
    publishNowButton: "Publish Now",
    cancelEditButton: "Cancel",
    sendEditInstruction: "Send your edit instruction (e.g., 'Make it shorter', 'Add more emojis'):",
    editingPost: "Editing post...",
    editSuccess: "Post updated successfully!",
    editFailed: "Failed to edit post. Please try again.",
    regeneratingImage: "Regenerating image...",
    imageRegenerated: "Image regenerated successfully!",
    imageRegenerationFailed: "Failed to regenerate image. Please try again.",
    postPublished: "Post published successfully!",
    editCancelled: "Edit cancelled.",
    noImageToRegenerate: "This post doesn't have an image to regenerate.",
    postPreviewTitle: "Post Preview",
    regeneratePostButton: "Regenerate",
    regeneratingPost: "Regenerating post from source...",
    postRegenerated: "Post regenerated successfully!",
    regenerationFailed: "Failed to regenerate post. Please try again.",
    noContentPlan: "Cannot regenerate - this post has no content plan.",
  },
  ru: {
    welcome: "Добро пожаловать в AI Telegram Channels Platform!",
    welcomeDescription:
      "Я помогу вам управлять вашими Telegram-каналами с помощью AI-генерации контента.",
    loginPrompt:
      "Для начала отправьте мне код аутентификации из веб-приложения.",
    loginSuccess: "Вы успешно авторизованы!",
    loginFailed: "Ошибка аутентификации. Код недействителен или истёк.",
    loginExpired: "Срок действия кода истёк. Пожалуйста, сгенерируйте новый.",
    loginAlreadyUsed: "Этот код уже был использован.",
    codeInvalid: "Неверный формат кода. Введите 6-символьный код.",
    statusOverview: "Обзор ваших каналов:",
    noChannels: "У вас пока нет каналов. Добавьте один через веб-приложение!",
    channelsList: "Ваши каналы:",
    pendingPosts: "Посты на проверку:",
    noPendingPosts: "Нет постов, ожидающих проверки.",
    languageChanged: "Язык изменён на русский.",
    helpTitle: "Доступные команды:",
    helpCommands: `
/start - Приветственное сообщение и помощь
/login - Сгенерировать код аутентификации
/status - Обзор ваших каналов
/channels - Список ваших каналов
/pending - Посты на проверку
/lang - Сменить язык (English/Русский)
/help - Показать это сообщение`,
    publishSuccess: "Пост успешно опубликован!",
    publishFailed: "Не удалось опубликовать пост:",
    reviewPost: "Новый пост готов для проверки:",
    reviewButtons: {
      approve: "Одобрить",
      edit: "Редактировать",
      reject: "Отклонить",
      schedule: "Запланировать",
    },
    approved: "Пост одобрен и опубликован!",
    rejected: "Пост отклонён.",
    scheduled: "Пост запланирован.",
    errorOccurred: "Произошла ошибка. Пожалуйста, попробуйте снова.",
    notAuthenticated: "Пожалуйста, сначала авторизуйтесь с помощью кода из веб-приложения.",
    scrapingComplete: "Сбор данных завершён! Найдено {count} новых постов.",
    channelAdded: "Канал '{title}' успешно добавлен!",
    channelRemoved: "Канал удалён.",
    // Review edit flow
    reviewEditMode: "Режим редактирования",
    reviewEditInstructions: "Вы можете отредактировать текст или перегенерировать изображение для этого поста.",
    editTextButton: "Изменить текст",
    regenerateImageButton: "Перегенерировать",
    publishNowButton: "Опубликовать",
    cancelEditButton: "Отмена",
    sendEditInstruction: "Отправьте инструкцию по редактированию (например, 'Сделай короче', 'Добавь эмодзи'):",
    editingPost: "Редактирую пост...",
    editSuccess: "Пост успешно обновлён!",
    editFailed: "Не удалось отредактировать пост. Попробуйте снова.",
    regeneratingImage: "Перегенерирую изображение...",
    imageRegenerated: "Изображение успешно перегенерировано!",
    imageRegenerationFailed: "Не удалось перегенерировать изображение. Попробуйте снова.",
    postPublished: "Пост успешно опубликован!",
    editCancelled: "Редактирование отменено.",
    noImageToRegenerate: "У этого поста нет изображения для перегенерации.",
    postPreviewTitle: "Предпросмотр поста",
    regeneratePostButton: "Заново",
    regeneratingPost: "Перегенерирую пост из источника...",
    postRegenerated: "Пост успешно перегенерирован!",
    regenerationFailed: "Не удалось перегенерировать пост. Попробуйте снова.",
    noContentPlan: "Невозможно перегенерировать — у поста нет контент-плана.",
  },
} as const;

export type Language = keyof typeof messages;
export type MessageKey = keyof (typeof messages)["en"];

export function t(
  lang: Language,
  key: MessageKey,
  params?: Record<string, string | number>
): string {
  const message = messages[lang]?.[key] ?? messages.en[key];

  if (typeof message === "string" && params) {
    let result: string = message;
    for (const [k, v] of Object.entries(params)) {
      result = result.replace(`{${k}}`, String(v));
    }
    return result;
  }

  return typeof message === "string" ? message : JSON.stringify(message);
}

export function getReviewButtons(lang: Language) {
  return messages[lang].reviewButtons;
}

export { messages };
