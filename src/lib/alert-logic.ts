interface AlertInput {
  eventDate: string;
  incompleteCount: number;
  lastAlertSentAt: Date | null;
}

export function shouldSendAlert(input: AlertInput): boolean {
  if (input.incompleteCount === 0) return false;

  const now = new Date();
  const eventDate = new Date(input.eventDate + "T00:00:00");
  const hoursUntil = (eventDate.getTime() - now.getTime()) / (1000 * 60 * 60);

  if (hoursUntil > 48 || hoursUntil < 0) return false;

  if (input.lastAlertSentAt) {
    const hoursSinceLastAlert = (now.getTime() - input.lastAlertSentAt.getTime()) / (1000 * 60 * 60);
    if (hoursSinceLastAlert < 24) return false;
  }

  return true;
}
