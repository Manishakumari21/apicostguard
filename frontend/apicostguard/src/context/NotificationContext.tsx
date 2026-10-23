import { createContext, useContext, useReducer, type Dispatch, type ReactNode } from "react";
import type { Notification } from "../types/notification";

export interface NotificationState {
  items: Notification[];
  unreadCount: number;
}

export type NotificationAction =
  | { type: "ADD_NOTIFICATION"; payload: Notification }
  | { type: "SET_NOTIFICATIONS"; payload: Notification[] }
  | { type: "MARK_READ"; payload: string }
  | { type: "MARK_ALL_READ" }
  | { type: "CLEAR" };

const initialState: NotificationState = {
  items: [],
  unreadCount: 0,
};

function reducer(state: NotificationState, action: NotificationAction): NotificationState {
  switch (action.type) {
    case "ADD_NOTIFICATION": {
      const items = [action.payload, ...state.items];
      return { items, unreadCount: state.unreadCount + 1 };
    }
    case "SET_NOTIFICATIONS": {
      const items = action.payload;
      const unreadCount = items.filter((n) => !n.read).length;
      return { items, unreadCount };
    }
    case "MARK_READ": {
      const items = state.items.map((n) =>
        n.id === action.payload ? { ...n, read: true } : n
      );
      return { items, unreadCount: Math.max(0, state.unreadCount - 1) };
    }
    case "MARK_ALL_READ":
      return {
        items: state.items.map((n) => ({ ...n, read: true })),
        unreadCount: 0,
      };
    case "CLEAR":
      return initialState;
    default:
      return state;
  }
}

const NotificationContext = createContext<NotificationState | null>(null);
const NotificationDispatchContext = createContext<Dispatch<NotificationAction> | null>(null);

export function NotificationProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);
  return (
    <NotificationContext.Provider value={state}>
      <NotificationDispatchContext.Provider value={dispatch}>
        {children}
      </NotificationDispatchContext.Provider>
    </NotificationContext.Provider>
  );
}

export function useNotifications(): NotificationState {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error("useNotifications must be used within a NotificationProvider");
  return ctx;
}

export function useNotificationDispatch(): Dispatch<NotificationAction> {
  const ctx = useContext(NotificationDispatchContext);
  if (!ctx) throw new Error("useNotificationDispatch must be used within a NotificationProvider");
  return ctx;
}
