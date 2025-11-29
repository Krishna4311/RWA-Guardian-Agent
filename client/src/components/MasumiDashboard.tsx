import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Server, Database, Wallet, RefreshCw, CheckCircle2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

interface MasumiStatus {
    status: 'online' | 'offline';
    network: string;
    projects: any[];
    error?: string;
}

export default function MasumiDashboard() {
    const [status, setStatus] = useState<MasumiStatus | null>(null);
    const [loading, setLoading] = useState(false);
    const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

    const fetchStatus = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/masumi/status');
            const data = await res.json();
            setStatus(data);
            setLastUpdated(new Date());
        } catch (error) {
            console.error('Failed to fetch Masumi status:', error);
            setStatus({ status: 'offline', network: 'Unknown', projects: [], error: 'Connection failed' });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchStatus();
        const interval = setInterval(fetchStatus, 10000); // Poll every 10s
        return () => clearInterval(interval);
    }, []);

    return (
        <Card className="bg-slate-800/50 border-slate-700 mb-6">
            <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                    <CardTitle className="text-lg font-bold text-white flex items-center gap-2">
                        <Database className="w-5 h-5 text-blue-400" />
                        Masumi Network Status (Local Node)
                    </CardTitle>
                    <div className="flex items-center gap-2">
                        <span className="text-xs text-slate-500">
                            {lastUpdated ? `Updated: ${lastUpdated.toLocaleTimeString()}` : 'Connecting...'}
                        </span>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-slate-400 hover:text-white hover:bg-slate-700"
                            onClick={fetchStatus}
                            disabled={loading}
                        >
                            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                        </Button>
                    </div>
                </div>
            </CardHeader>
            <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Service Status */}
                    <div className="bg-slate-900/50 rounded-lg p-4 border border-slate-700">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-slate-400 text-sm flex items-center gap-2">
                                <Server className="w-4 h-4" /> Service Health
                            </span>
                            {status?.status === 'online' ? (
                                <Badge className="bg-green-500/20 text-green-400 border-green-500/30">Online</Badge>
                            ) : (
                                <Badge className="bg-red-500/20 text-red-400 border-red-500/30">Offline</Badge>
                            )}
                        </div>
                        <div className="text-xs text-slate-500">
                            Endpoint: <code className="bg-slate-800 px-1 rounded">http://localhost:3001</code>
                        </div>
                        {status?.error && (
                            <div className="mt-2 text-xs text-red-400 flex items-center gap-1">
                                <XCircle className="w-3 h-3" /> {status.error}
                            </div>
                        )}
                    </div>

                    {/* Network Info */}
                    <div className="bg-slate-900/50 rounded-lg p-4 border border-slate-700">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-slate-400 text-sm flex items-center gap-2">
                                <Database className="w-4 h-4" /> Network
                            </span>
                            <span className="text-white font-medium">{status?.network || 'Unknown'}</span>
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="text-slate-400 text-sm">Projects Found</span>
                            <span className="text-white font-bold text-lg">{status?.projects.length || 0}</span>
                        </div>
                    </div>

                    {/* Wallet (Mocked for now) */}
                    <div className="bg-slate-900/50 rounded-lg p-4 border border-slate-700">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-slate-400 text-sm flex items-center gap-2">
                                <Wallet className="w-4 h-4" /> Admin Wallet
                            </span>
                            <Badge variant="outline" className="border-slate-600 text-slate-400">Dev</Badge>
                        </div>
                        <div className="text-2xl font-bold text-white">
                            10,000 <span className="text-sm text-slate-400 font-normal">ADA (Test)</span>
                        </div>
                    </div>
                </div>

                {/* Project List */}
                <div className="mt-4">
                    <h4 className="text-sm font-medium text-slate-300 mb-2">Registered Projects</h4>
                    {status?.projects && status.projects.length > 0 ? (
                        <div className="space-y-2">
                            {status.projects.map((proj: any, i: number) => (
                                <div key={i} className="bg-slate-800 p-2 rounded border border-slate-700 flex justify-between items-center">
                                    <span className="text-white text-sm">{proj.name || 'Unnamed Project'}</span>
                                    <Badge variant="secondary" className="text-xs">Active</Badge>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-4 bg-slate-900/30 rounded border border-slate-800 border-dashed">
                            <p className="text-slate-500 text-sm">No projects found in registry.</p>
                            <p className="text-xs text-slate-600 mt-1">Register a project to see it here.</p>
                        </div>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}
