import * as Notifications from "expo-notifications";
import { SchedulableTriggerInputTypes } from "expo-notifications";
import AsyncStorage from "@react-native-async-storage/async-storage";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

function nextNotificationDate(dueDay: number): Date {
  const today = new Date();
  const notifyDay = Math.max(1, dueDay - 3);
  const d = new Date(today.getFullYear(), today.getMonth(), notifyDay, 9, 0, 0);
  if (d <= today) d.setMonth(d.getMonth() + 1);
  return d;
}

const notifKey = (billId: string) => `notif:${billId}`;

export async function scheduleBillNotification(
  billId: string,
  name: string,
  dueDay: number
): Promise<void> {
  const { status } = await Notifications.getPermissionsAsync();
  if (status !== "granted") {
    const { status: requested } = await Notifications.requestPermissionsAsync();
    if (requested !== "granted") return;
  }

  await cancelBillNotification(billId);

  const date = nextNotificationDate(dueDay);
  const secondsUntil = Math.max(1, Math.floor((date.getTime() - Date.now()) / 1000));

  const notifId = await Notifications.scheduleNotificationAsync({
    content: {
      title: "Conta a vencer em breve",
      body: `"${name}" vence no dia ${dueDay}.`,
      data: { billId },
    },
    trigger: {
      type: SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds: secondsUntil,
      repeats: false,
    },
  });

  await AsyncStorage.setItem(notifKey(billId), notifId);
}

export async function cancelBillNotification(billId: string): Promise<void> {
  const notifId = await AsyncStorage.getItem(notifKey(billId));
  if (notifId) {
    await Notifications.cancelScheduledNotificationAsync(notifId).catch(() => undefined);
    await AsyncStorage.removeItem(notifKey(billId));
  }
}
