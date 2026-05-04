import React, { useState, useEffect } from 'react';
import { User, Mail, Calendar, Clock, Shield, UserCircle, LogOut, Rocket, ExternalLink } from 'lucide-react';
import { User as UserType } from '../types';

interface Project {
  id: number;
  name: string;
  subdomain: string;
  deployedAt: string;
}

interface UserProfilePageProps {
  user: UserType;
  onLogout: () => void;
}

const UserProfilePage: React.FC<UserProfilePageProps> = ({ user, onLogout }) => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProjects = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await fetch('/api/projects', {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          setProjects(data.projects);
        }
      } catch (e) {
        console.error("Failed to fetch projects", e);
      } finally {
        setLoading(false);
      }
    };
    fetchProjects();
  }, []);

  return (
    <div className="flex-1 bg-[#0f0f0f] overflow-y-auto flex flex-col items-center p-8">
      <div className="w-full max-w-3xl bg-[#1e1e1e] border border-gray-800 rounded-2xl shadow-xl overflow-hidden mt-8">
        
        {/* Header Background */}
        <div className="h-40 bg-gradient-to-r from-blue-700 to-indigo-800 relative">
        </div>

        {/* Profile Avatar */}
        <div className="relative px-10 pb-10">
            <div className="absolute -top-16 left-10 w-32 h-32 rounded-full bg-[#1e1e1e] p-2">
                <div className="w-full h-full rounded-full bg-gradient-to-br from-gray-700 to-gray-900 flex items-center justify-center text-5xl font-bold text-gray-200 shadow-inner select-none pointer-events-none">
                    {user.username.slice(0, 2).toUpperCase()}
                </div>
            </div>

            <div className="mt-20 flex justify-between items-start">
                <div>
                    <h2 className="text-3xl font-bold text-white flex items-center gap-3">
                        {user.firstName} {user.lastName}
                        {user.username === 'admin' && <Shield size={22} className="text-yellow-500" title="Administrator" />}
                    </h2>
                    <p className="text-blue-400 font-medium mt-1 text-lg">@{user.username}</p>
                </div>
                <button 
                    onClick={onLogout}
                    className="flex items-center gap-2 px-6 py-2.5 bg-red-500/10 text-red-500 hover:bg-red-500/20 border border-red-500/20 rounded-lg font-medium transition-colors"
                >
                    <LogOut size={16} /> Sign Out
                </button>
            </div>

            <div className="mt-10 grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-[#252526] p-5 rounded-xl border border-gray-700/50 flex items-start gap-4">
                    <div className="w-12 h-12 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-400 shrink-0">
                        <Mail size={24} />
                    </div>
                    <div>
                        <div className="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-1">Email Address</div>
                        <div className="text-gray-200 text-base">{user.email || 'Not provided'}</div>
                    </div>
                </div>

                <div className="bg-[#252526] p-5 rounded-xl border border-gray-700/50 flex items-start gap-4">
                    <div className="w-12 h-12 rounded-full bg-purple-500/10 flex items-center justify-center text-purple-400 shrink-0">
                        <UserCircle size={24} />
                    </div>
                    <div>
                        <div className="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-1">Username</div>
                        <div className="text-gray-200 text-base">{user.username}</div>
                    </div>
                </div>

                <div className="bg-[#252526] p-5 rounded-xl border border-gray-700/50 flex items-start gap-4">
                    <div className="w-12 h-12 rounded-full bg-indigo-500/10 flex items-center justify-center text-indigo-400 shrink-0">
                        <User size={24} />
                    </div>
                    <div>
                        <div className="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-1">Full Name</div>
                        <div className="text-gray-200 text-base">{user.firstName} {user.lastName}</div>
                    </div>
                </div>

                <div className="bg-[#252526] p-5 rounded-xl border border-gray-700/50 flex items-start gap-4">
                    <div className="w-12 h-12 rounded-full bg-green-500/10 flex items-center justify-center text-green-400 shrink-0">
                        <Clock size={24} />
                    </div>
                    <div>
                        <div className="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-1">Last Login</div>
                        <div className="text-gray-200 text-base">
                            {user.lastLogin ? new Date(user.lastLogin).toLocaleString() : 'Just now'}
                        </div>
                    </div>
                </div>
            </div>
        </div>
      </div>

      {/* Projects List */}
      <div className="w-full max-w-3xl mt-8">
        <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2 px-2">
            <Rocket size={20} className="text-blue-400" />
            Deployed Projects
        </h3>
        <div className="grid grid-cols-1 gap-4">
            {loading ? (
                <div className="text-gray-500 text-sm italic px-2">Loading projects...</div>
            ) : projects.length === 0 ? (
                <div className="bg-[#1e1e1e] border border-gray-800 rounded-xl p-8 text-center text-gray-500">
                    <p>No projects deployed to deploystudio.org yet.</p>
                </div>
            ) : (
                projects.map(project => (
                    <div key={project.id} className="bg-[#1e1e1e] border border-gray-800 rounded-xl p-5 flex items-center justify-between hover:border-gray-600 transition-colors">
                        <div>
                            <h4 className="text-white font-medium text-lg">{project.name}</h4>
                            <p className="text-blue-400 text-sm">https://{project.subdomain}.deploystudio.org</p>
                            <div className="flex items-center gap-3 mt-2 text-[10px] text-gray-500 uppercase tracking-widest font-bold">
                                <span>Deployed {new Date(project.deployedAt).toLocaleDateString()}</span>
                                <span className="w-1 h-1 bg-gray-700 rounded-full"></span>
                                <span className="text-green-500">Active</span>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <a 
                                href={`/site/${project.subdomain}`} 
                                target="_blank" 
                                rel="noreferrer"
                                className="p-3 bg-green-500/10 text-green-400 hover:bg-green-500 hover:text-white rounded-full transition-all"
                                title="Open Preview"
                            >
                                <Rocket size={20} />
                            </a>
                            <a 
                                href={`https://${project.subdomain}.deploystudio.org`} 
                                target="_blank" 
                                rel="noreferrer"
                                className="p-3 bg-blue-500/10 text-blue-400 hover:bg-blue-500 hover:text-white rounded-full transition-all"
                                title="Visit Live Site"
                            >
                                <ExternalLink size={20} />
                            </a>
                        </div>
                    </div>
                ))
            )}
        </div>
      </div>

      <div className="mt-12 text-center text-xs text-gray-600">
        Deploy Studio Account • ID: {user.username}-{Date.now().toString().slice(-4)}
      </div>
    </div>
  );
};

export default UserProfilePage;
