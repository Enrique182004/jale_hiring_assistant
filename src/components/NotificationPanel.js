import React from 'react';
import { Bell, X, DollarSign, Calendar, MessageSquare, CheckCircle } from 'lucide-react';
import { format } from 'date-fns';

const NotificationPanel = ({ notifications, unreadCount, onClose, onMarkAsRead }) => {
  const getIcon = (type) => {
    switch (type) {
      case 'new_quote':
        return <DollarSign className="w-5 h-5 text-green-600" />;
      case 'interview_scheduled':
        return <Calendar className="w-5 h-5 text-blue-600" />;
      case 'message_received':
        return <MessageSquare className="w-5 h-5 text-purple-600" />;
      case 'worker_accepted':
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      default:
        return <Bell className="w-5 h-5 text-gray-600" />;
    }
  };

  return (
    <div className="absolute right-4 top-16 w-96 bg-white rounded-xl shadow-2xl border border-gray-200 z-50 max-h-[600px] flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 flex justify-between items-center">
        <div>
          <h3 className="font-bold text-gray-900">Notifications</h3>
          {unreadCount > 0 && (
            <p className="text-xs text-gray-500 mt-1">{unreadCount} unread</p>
          )}
        </div>
        <button 
          onClick={onClose}
          className="p-1 hover:bg-gray-100 rounded-lg transition"
        >
          <X className="w-5 h-5 text-gray-500" />
        </button>
      </div>

      {/* Notifications List */}
      <div className="flex-1 overflow-y-auto">
        {notifications.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <Bell className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p className="font-medium">No notifications</p>
            <p className="text-sm mt-1">You're all caught up!</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {notifications.map((notif) => (
              <div
                key={notif.id}
                className={`p-4 hover:bg-gray-50 transition cursor-pointer ${
                  !notif.read ? 'bg-blue-50' : ''
                }`}
                onClick={() => onMarkAsRead(notif.id)}
              >
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0 mt-1">
                    {getIcon(notif.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm text-gray-900">
                      {notif.title}
                    </p>
                    <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                      {notif.message}
                    </p>
                    {notif.amount && (
                      <p className="text-sm font-bold text-green-600 mt-2">
                        ${notif.amount.toFixed(2)}
                      </p>
                    )}
                    <p className="text-xs text-gray-400 mt-2">
                      {format(new Date(notif.timestamp), 'PPp')}
                    </p>
                  </div>
                  {!notif.read && (
                    <div className="w-2 h-2 bg-blue-600 rounded-full flex-shrink-0"></div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      {notifications.length > 0 && unreadCount > 0 && (
        <div className="p-3 border-t border-gray-200">
          <button
            onClick={() => notifications.forEach(n => !n.read && onMarkAsRead(n.id))}
            className="w-full text-sm text-blue-600 font-semibold hover:text-blue-700 py-2"
          >
            Mark all as read
          </button>
        </div>
      )}
    </div>
  );
};

export default NotificationPanel;