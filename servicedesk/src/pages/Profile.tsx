import React from "react";
import { Avatar } from "antd";
import { UserOutlined, MailOutlined, IdcardOutlined } from "@ant-design/icons";
import { useAuth } from "../contexts/AuthContext";

const Profile: React.FC = () => {
  const { user } = useAuth();

  if (!user) return null;

  return (
    <div className="max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold text-slate-800 mb-6">My Profile</h1>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        {/* Header Background */}
        <div className="h-32 bg-gradient-to-r from-blue-500 to-blue-600"></div>

        <div className="px-8 pb-8">
          {/* Avatar */}
          <div className="relative -mt-16 mb-6">
            <div className="w-32 h-32 rounded-full border-4 border-white bg-white shadow-md flex items-center justify-center overflow-hidden">
              <Avatar
                size={120}
                icon={<UserOutlined />}
                className="bg-slate-200 text-slate-500"
              />
            </div>
          </div>

          {/* User Info */}
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-slate-800">
              {user.first_name && user.last_name
                ? `${user.first_name} ${user.last_name}`
                : user.username}
            </h2>
            <p className="text-slate-500">{user.email}</p>
          </div>

          {/* Details Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
              <div className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-1">
                Username
              </div>
              <div className="font-medium text-slate-700 flex items-center gap-2">
                <IdcardOutlined className="text-blue-500" />
                {user.username}
              </div>
            </div>

            <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
              <div className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-1">
                Email Address
              </div>
              <div className="font-medium text-slate-700 flex items-center gap-2">
                <MailOutlined className="text-blue-500" />
                {user.email}
              </div>
            </div>

            <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
              <div className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-1">
                First Name
              </div>
              <div className="font-medium text-slate-700">
                {user.first_name || "—"}
              </div>
            </div>

            <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
              <div className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-1">
                Last Name
              </div>
              <div className="font-medium text-slate-700">
                {user.last_name || "—"}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;
