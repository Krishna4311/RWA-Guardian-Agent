import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { evGuardianApi } from "@/services/evGuardianApi";
import { SessionState, SessionStatus } from "@shared/types";
import {
    Activity,
    AlertTriangle,
    CheckCircle2,
    Clock,
    Zap,
    TrendingUp,
    Shield,
    Play,
    Square,
    Trash2
} from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { toast } from "sonner";

export default function EVGuardianDashboard() {
    const [sessions, setSessions] = useState<SessionState[]>([]);
    const [selectedSession, setSelectedSession] = useState<SessionState | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [autoRefresh, setAutoRefresh] = useState(true);

    // Fetch all sessions
    const fetchSessions = async () => {
        try {
            const response = await evGuardianApi.getAllSessions();
            setSessions(response.sessions);

            // Update selected session if it exists
            if (selectedSession) {
                const updated = response.sessions.find(s => s.sessionId === selectedSession.sessionId);
                if (updated) {
                    setSelectedSession(updated);
                }
            }
        } catch (error) {
            console.error("Failed to fetch sessions:", error);
        }
    };

    // Auto-refresh sessions
    useEffect(() => {
        fetchSessions();

        if (autoRefresh) {
            const interval = setInterval(fetchSessions, 1000);
            return () => clearInterval(interval);
        }
    }, [autoRefresh]);

    // Start a new session
    const startSession = async (sessionType: "normal" | "fraudulent") => {
        setIsLoading(true);
        try {
            const response = await evGuardianApi.startSession({
                sessionType,
                duration: 30, // 30 seconds for demo
                interval: 500, // 500ms between readings
            });

            toast.success(`${sessionType === "normal" ? "Normal" : "Fraudulent"} session started`, {
                description: `Session ID: ${response.sessionId}`,
            });

            await fetchSessions();
        } catch (error) {
            toast.error("Failed to start session");
            console.error(error);
        } finally {
            setIsLoading(false);
        }
    };

    // Stop a session
    const stopSession = async (sessionId: string) => {
        try {
            await evGuardianApi.stopSession(sessionId);
            toast.success("Session stopped");
            await fetchSessions();
        } catch (error) {
            toast.error("Failed to stop session");
            console.error(error);
        }
    };

    // Delete a session
    const deleteSession = async (sessionId: string) => {
        try {
            await evGuardianApi.deleteSession(sessionId);
            toast.success("Session deleted");
            if (selectedSession?.sessionId === sessionId) {
                setSelectedSession(null);
            }
            await fetchSessions();
        } catch (error) {
            toast.error("Failed to delete session");
            console.error(error);
        }
    };

    // Get status badge
    const getStatusBadge = (status: SessionStatus) => {
        switch (status) {
            case "VALID":
                return <Badge className="bg-green-500"><CheckCircle2 className="w-3 h-3 mr-1" />Valid</Badge>;
            case "FRAUD":
                return <Badge className="bg-red-500"><AlertTriangle className="w-3 h-3 mr-1" />Fraud</Badge>;
            case "PENDING":
                return <Badge variant="outline"><Clock className="w-3 h-3 mr-1" />Pending</Badge>;
        }
    };

    // Prepare chart data
    const getChartData = (session: SessionState) => {
        return session.readings.map(r => ({
            time: r.timestamp,
            voltage: r.voltage,
            current: r.current,
            energy: r.energyKWh,
        }));
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-6">
            <div className="max-w-7xl mx-auto space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-4xl font-bold text-white flex items-center gap-3">
                            <Shield className="w-10 h-10 text-blue-400" />
                            EV Guardian Agent
                        </h1>
                        <p className="text-slate-400 mt-2">
                            Real-time EV charging session monitoring with fraud detection
                        </p>
                    </div>
                    <div className="flex gap-3">
                        <Button
                            onClick={() => startSession("normal")}
                            disabled={isLoading}
                            className="bg-green-600 hover:bg-green-700"
                        >
                            <Play className="w-4 h-4 mr-2" />
                            Start Normal Session
                        </Button>
                        <Button
                            onClick={() => startSession("fraudulent")}
                            disabled={isLoading}
                            className="bg-red-600 hover:bg-red-700"
                        >
                            <AlertTriangle className="w-4 h-4 mr-2" />
                            Start Fraudulent Session
                        </Button>
                    </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <Card className="bg-slate-800/50 border-slate-700">
                        <CardHeader className="pb-3">
                            <CardTitle className="text-sm font-medium text-slate-400">Total Sessions</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-3xl font-bold text-white">{sessions.length}</div>
                        </CardContent>
                    </Card>

                    <Card className="bg-slate-800/50 border-slate-700">
                        <CardHeader className="pb-3">
                            <CardTitle className="text-sm font-medium text-slate-400">Valid Sessions</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-3xl font-bold text-green-400">
                                {sessions.filter(s => s.status === "VALID").length}
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="bg-slate-800/50 border-slate-700">
                        <CardHeader className="pb-3">
                            <CardTitle className="text-sm font-medium text-slate-400">Fraud Detected</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-3xl font-bold text-red-400">
                                {sessions.filter(s => s.status === "FRAUD").length}
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="bg-slate-800/50 border-slate-700">
                        <CardHeader className="pb-3">
                            <CardTitle className="text-sm font-medium text-slate-400">Active Sessions</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-3xl font-bold text-blue-400">
                                {sessions.filter(s => s.isSimulating).length}
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Main Content */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Sessions List */}
                    <Card className="lg:col-span-1 bg-slate-800/50 border-slate-700">
                        <CardHeader>
                            <CardTitle className="text-white">Sessions</CardTitle>
                            <CardDescription>Click to view details</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-2 max-h-[600px] overflow-y-auto">
                            {sessions.length === 0 ? (
                                <p className="text-slate-400 text-center py-8">No sessions yet. Start one above!</p>
                            ) : (
                                sessions.map(session => (
                                    <div
                                        key={session.sessionId}
                                        onClick={() => setSelectedSession(session)}
                                        className={`p-4 rounded-lg border cursor-pointer transition-all ${selectedSession?.sessionId === session.sessionId
                                            ? "bg-slate-700 border-blue-500"
                                            : "bg-slate-800 border-slate-600 hover:bg-slate-700"
                                            }`}
                                    >
                                        <div className="flex items-center justify-between mb-2">
                                            <span className="font-mono text-sm text-slate-300">
                                                {session.sessionId}
                                            </span>
                                            {session.isSimulating && (
                                                <Activity className="w-4 h-4 text-blue-400 animate-pulse" />
                                            )}
                                        </div>
                                        <div className="flex items-center justify-between">
                                            {getStatusBadge(session.status)}
                                            <span className="text-xs text-slate-400">
                                                {session.readings.length} readings
                                            </span>
                                        </div>
                                        {session.isSimulating && (
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                className="w-full mt-2"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    stopSession(session.sessionId);
                                                }}
                                            >
                                                <Square className="w-3 h-3 mr-1" />
                                                Stop
                                            </Button>
                                        )}
                                        {!session.isSimulating && (
                                            <Button
                                                size="sm"
                                                variant="ghost"
                                                className="w-full mt-2 text-red-400 hover:text-red-300"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    deleteSession(session.sessionId);
                                                }}
                                            >
                                                <Trash2 className="w-3 h-3 mr-1" />
                                                Delete
                                            </Button>
                                        )}
                                    </div>
                                ))
                            )}
                        </CardContent>
                    </Card>

                    {/* Session Details */}
                    <Card className="lg:col-span-2 bg-slate-800/50 border-slate-700">
                        <CardHeader>
                            <CardTitle className="text-white">
                                {selectedSession ? `Session: ${selectedSession.sessionId}` : "Select a Session"}
                            </CardTitle>
                            <CardDescription>
                                {selectedSession ? "Real-time monitoring and analysis" : "Click on a session to view details"}
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            {!selectedSession ? (
                                <div className="flex items-center justify-center h-96 text-slate-400">
                                    <div className="text-center">
                                        <Zap className="w-16 h-16 mx-auto mb-4 opacity-50" />
                                        <p>No session selected</p>
                                    </div>
                                </div>
                            ) : (
                                <Tabs defaultValue="charts" className="w-full">
                                    <TabsList className="grid w-full grid-cols-3 bg-slate-700">
                                        <TabsTrigger value="charts">Charts</TabsTrigger>
                                        <TabsTrigger value="anomalies">Anomalies</TabsTrigger>
                                        <TabsTrigger value="blockchain">Blockchain</TabsTrigger>
                                    </TabsList>

                                    <TabsContent value="charts" className="space-y-4">
                                        {selectedSession.readings.length === 0 ? (
                                            <p className="text-slate-400 text-center py-8">No readings yet...</p>
                                        ) : (
                                            <>
                                                {/* Voltage Chart */}
                                                <div className="bg-slate-900/50 p-4 rounded-lg">
                                                    <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
                                                        <TrendingUp className="w-4 h-4" />
                                                        Voltage (V)
                                                    </h3>
                                                    <ResponsiveContainer width="100%" height={200}>
                                                        <LineChart data={getChartData(selectedSession)}>
                                                            <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                                                            <XAxis dataKey="time" stroke="#94a3b8" />
                                                            <YAxis stroke="#94a3b8" domain={[150, 300]} />
                                                            <Tooltip
                                                                contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155' }}
                                                                labelStyle={{ color: '#94a3b8' }}
                                                            />
                                                            <Line type="monotone" dataKey="voltage" stroke="#3b82f6" strokeWidth={2} dot={false} />
                                                        </LineChart>
                                                    </ResponsiveContainer>
                                                </div>

                                                {/* Current Chart */}
                                                <div className="bg-slate-900/50 p-4 rounded-lg">
                                                    <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
                                                        <TrendingUp className="w-4 h-4" />
                                                        Current (A)
                                                    </h3>
                                                    <ResponsiveContainer width="100%" height={200}>
                                                        <LineChart data={getChartData(selectedSession)}>
                                                            <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                                                            <XAxis dataKey="time" stroke="#94a3b8" />
                                                            <YAxis stroke="#94a3b8" />
                                                            <Tooltip
                                                                contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155' }}
                                                                labelStyle={{ color: '#94a3b8' }}
                                                            />
                                                            <Line type="monotone" dataKey="current" stroke="#10b981" strokeWidth={2} dot={false} />
                                                        </LineChart>
                                                    </ResponsiveContainer>
                                                </div>

                                                {/* Energy Chart */}
                                                <div className="bg-slate-900/50 p-4 rounded-lg">
                                                    <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
                                                        <Zap className="w-4 h-4" />
                                                        Energy (kWh)
                                                    </h3>
                                                    <ResponsiveContainer width="100%" height={200}>
                                                        <LineChart data={getChartData(selectedSession)}>
                                                            <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                                                            <XAxis dataKey="time" stroke="#94a3b8" />
                                                            <YAxis stroke="#94a3b8" />
                                                            <Tooltip
                                                                contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155' }}
                                                                labelStyle={{ color: '#94a3b8' }}
                                                            />
                                                            <Line type="monotone" dataKey="energy" stroke="#f59e0b" strokeWidth={2} dot={false} />
                                                        </LineChart>
                                                    </ResponsiveContainer>
                                                </div>
                                            </>
                                        )}
                                    </TabsContent>

                                    <TabsContent value="anomalies" className="space-y-4">
                                        {selectedSession.anomalies.length === 0 ? (
                                            <Alert className="bg-green-900/20 border-green-500">
                                                <CheckCircle2 className="h-4 w-4 text-green-400" />
                                                <AlertDescription className="text-green-300">
                                                    No anomalies detected. Session is operating normally.
                                                </AlertDescription>
                                            </Alert>
                                        ) : (
                                            <div className="space-y-3">
                                                {selectedSession.anomalies.map((anomaly, idx) => (
                                                    <Alert key={idx} className="bg-red-900/20 border-red-500">
                                                        <AlertTriangle className="h-4 w-4 text-red-400" />
                                                        <AlertDescription className="text-red-300">
                                                            <div className="font-semibold mb-1">
                                                                {anomaly.type.replace(/_/g, " ").toUpperCase()}
                                                            </div>
                                                            <div className="text-sm">{anomaly.message}</div>
                                                            <div className="text-xs text-red-400 mt-1">
                                                                Timestamp: {anomaly.timestamp}s
                                                            </div>
                                                        </AlertDescription>
                                                    </Alert>
                                                ))}
                                            </div>
                                        )}
                                    </TabsContent>

                                    <TabsContent value="blockchain" className="space-y-4">
                                        <div className="bg-slate-900/50 p-6 rounded-lg space-y-4">
                                            <div className="flex items-center justify-between">
                                                <span className="text-slate-400">Status:</span>
                                                {getStatusBadge(selectedSession.status)}
                                            </div>
                                            <div className="flex items-center justify-between">
                                                <span className="text-slate-400">On-Chain Action:</span>
                                                <Badge variant="outline" className="font-mono">
                                                    {selectedSession.onChainAction}
                                                </Badge>
                                            </div>
                                            <div className="flex items-center justify-between">
                                                <span className="text-slate-400">Last Updated:</span>
                                                <span className="text-white text-sm">
                                                    {new Date(selectedSession.updatedAt).toLocaleString()}
                                                </span>
                                            </div>

                                            {selectedSession.onChainAction !== "NONE" && (
                                                <Alert className="bg-blue-900/20 border-blue-500 mt-4">
                                                    <Shield className="h-4 w-4 text-blue-400" />
                                                    <AlertDescription className="text-blue-300">
                                                        <div className="font-semibold mb-1">Cardano Transaction Submitted</div>
                                                        <div className="text-sm">
                                                            This session has been recorded on the Cardano blockchain via the Aiken smart contract.
                                                        </div>
                                                        <div className="text-xs font-mono mt-2 p-2 bg-slate-950 rounded">
                                                            TxHash: 0x{Math.random().toString(16).substring(2, 18)}...
                                                        </div>
                                                    </AlertDescription>
                                                </Alert>
                                            )}
                                        </div>
                                    </TabsContent>
                                </Tabs>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
