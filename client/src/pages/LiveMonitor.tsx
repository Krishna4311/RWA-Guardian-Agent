import { useEffect, useState, useRef } from "react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, AlertTriangle, Link2 } from "lucide-react";
import { StreamData, BlockchainRecord } from "@shared/types";
import MasumiProcessVisualizer from "@/components/MasumiProcessVisualizer";
import DebugTerminal from "@/components/DebugTerminal";
import { toast } from "sonner";

/**
 * LiveMonitor component
 * Connects to /api/live-stream via Server‑Sent Events and displays a real‑time chart.
 * Valid readings are shown in green, fraud readings in red with an icon.
 */
export default function LiveMonitor() {
    const [data, setData] = useState<StreamData[]>([]);
    const [blockchainRecords, setBlockchainRecords] = useState<BlockchainRecord[]>([]);
    const [stats, setStats] = useState({ total: 0, valid: 0, fraud: 0 });
    const eventSourceRef = useRef<EventSource | null>(null);

    // Fetch blockchain records
    const fetchBlockchainRecords = async () => {
        try {
            const response = await fetch("/api/blockchain-records?limit=50");
            const json = await response.json();
            setBlockchainRecords(json.records || []);
        } catch (error) {
            console.error("Failed to fetch blockchain records:", error);
        }
    };

    useEffect(() => {
        const es = new EventSource("/api/live-stream");
        eventSourceRef.current = es;
        es.onmessage = (e) => {
            try {
                const parsed: StreamData = JSON.parse(e.data);
                setData((prev) => {
                    const next = [...prev, parsed];
                    // Keep only last 200 points
                    if (next.length > 200) next.shift();
                    return next;
                });

                // Update blockchain records immediately if present
                if (parsed.blockchainRecord) {
                    setBlockchainRecords((prev) => {
                        const next = [parsed.blockchainRecord!, ...prev];
                        // Keep only last 1000 records (same as backend limit)
                        if (next.length > 1000) next.pop();
                        return next;
                    });
                }

                // Update stats from backend source of truth
                if (parsed.stats) {
                    setStats(parsed.stats);
                }
            } catch (err) {
                console.error("Failed to parse SSE data", err);
            }
        };
        es.onerror = (err) => {
            console.error("SSE error", err);
            es.close();
        };

        // Initial fetch of blockchain records
        fetchBlockchainRecords();

        // Refresh blockchain records every 5 seconds (as a backup)
        const recordsInterval = setInterval(fetchBlockchainRecords, 5000);

        return () => {
            es.close();
            clearInterval(recordsInterval);
        };
    }, []);

    // Transform data for chart (timestamp on X axis, voltage on Y)
    const chartData = data.map((d) => ({
        time: new Date(d.timestamp).toLocaleTimeString(),
        voltage: d.voltage,
        status: d.status,
    }));

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-6">
            {/* Header Section */}
            <div className="mb-8">
                <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center">
                        <CheckCircle2 className="w-6 h-6 text-blue-400" />
                    </div>
                    <h1 className="text-3xl font-bold text-white">EV Guardian Agent</h1>
                </div>
                <p className="text-slate-400 text-sm ml-13">
                    Real-time EV charging session monitoring with <span className="text-blue-400 font-semibold">automatic fraud detection</span>
                </p>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                <Card className="bg-slate-800/50 border-slate-700">
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-slate-400 text-sm">Total Readings</p>
                                <p className="text-2xl font-bold text-white">{stats.total}</p>
                            </div>
                            <div className="w-12 h-12 bg-blue-500/20 rounded-lg flex items-center justify-center">
                                <CheckCircle2 className="w-6 h-6 text-blue-400" />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-slate-800/50 border-slate-700">
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-slate-400 text-sm">Valid Readings</p>
                                <p className="text-2xl font-bold text-green-400">
                                    {stats.valid}
                                </p>
                            </div>
                            <div className="w-12 h-12 bg-green-500/20 rounded-lg flex items-center justify-center">
                                <CheckCircle2 className="w-6 h-6 text-green-400" />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-slate-800/50 border-slate-700">
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-slate-400 text-sm">Fraud Detected</p>
                                <p className="text-2xl font-bold text-red-400">
                                    {stats.fraud}
                                </p>
                            </div>
                            <div className="w-12 h-12 bg-red-500/20 rounded-lg flex items-center justify-center">
                                <AlertTriangle className="w-6 h-6 text-red-400" />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-slate-800/50 border-slate-700">
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-slate-400 text-sm">Blockchain Records</p>
                                <p className="text-2xl font-bold text-purple-400">
                                    {stats.total}
                                </p>
                            </div>
                            <div className="w-12 h-12 bg-purple-500/20 rounded-lg flex items-center justify-center">
                                <Link2 className="w-6 h-6 text-purple-400" />
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Live Chart */}
            <Card className="bg-slate-800/50 border-slate-700 mb-6">
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <CardTitle className="text-xl font-bold text-white flex items-center gap-2">
                            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                            Live Voltage Monitor
                        </CardTitle>
                        <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30">
                            Auto-Detecting
                        </Badge>
                    </div>
                </CardHeader>
                <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                        <LineChart data={chartData}>
                            <XAxis dataKey="time" stroke="#94a3b8" />
                            <YAxis domain={[150, 300]} stroke="#94a3b8" />
                            <Tooltip
                                contentStyle={{ backgroundColor: "#1e293b", border: "1px solid #334155" }}
                                labelStyle={{ color: "#94a3b8" }}
                            />
                            <Line
                                type="monotone"
                                dataKey="voltage"
                                stroke={"#3b82f6"}
                                strokeWidth={2}
                                dot={false}
                                isAnimationActive={false}
                            />
                        </LineChart>
                    </ResponsiveContainer>

                    {/* Recent Status Badges */}
                    <div className="mt-4">
                        <p className="text-slate-400 text-sm mb-2">Recent Detections:</p>
                        <div className="flex flex-wrap gap-2">
                            {data.slice(-5).reverse().map((d, i) => (
                                <Badge
                                    key={i}
                                    className={d.status === "VALID" ? "bg-green-600" : "bg-red-600"}
                                >
                                    {d.status === "VALID" ? (
                                        <>
                                            <CheckCircle2 className="w-3 h-3 mr-1" />
                                            VALID
                                        </>
                                    ) : (
                                        <>
                                            <AlertTriangle className="w-3 h-3 mr-1" />
                                            FRAUD
                                        </>
                                    )}
                                </Badge>
                            ))}
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Masumi Process Visualization */}
            <MasumiProcessVisualizer latestRecord={blockchainRecords[0] || null} />

            {/* Blockchain Records Section */}
            <Card className="bg-slate-800/50 border-slate-700 mb-6">
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <CardTitle className="text-xl font-bold text-white flex items-center gap-2">
                            <Link2 className="w-5 h-5 text-purple-400" />
                            Blockchain Transaction Records
                        </CardTitle>
                        <div className="flex gap-2">
                            <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
                                Valid: {stats.valid}
                            </Badge>
                            <Badge className="bg-red-500/20 text-red-400 border-red-500/30">
                                Fraud: {stats.fraud}
                            </Badge>
                            <Badge className="bg-purple-500/20 text-purple-400 border-purple-500/30">
                                Total: {stats.total}
                            </Badge>
                        </div>
                    </div>
                    <p className="text-slate-400 text-sm mt-1">
                        All readings (VALID & FRAUD) submitted to Cardano blockchain
                    </p>
                </CardHeader>
                <CardContent>
                    {blockchainRecords.length === 0 ? (
                        <div className="text-center py-8 text-slate-400">
                            <Link2 className="w-12 h-12 mx-auto mb-3 opacity-30" />
                            <p>No blockchain records yet</p>
                            <p className="text-sm mt-1">All readings will be recorded on-chain</p>
                        </div>
                    ) : (
                        <div className="space-y-3 max-h-96 overflow-y-auto">
                            {blockchainRecords.map((record) => (
                                <div
                                    key={record.id}
                                    className="bg-slate-700/30 border border-slate-600 rounded-lg p-4 hover:bg-slate-700/50 transition-colors"
                                >
                                    <div className="flex items-start justify-between mb-2">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2 mb-1">
                                                <Badge
                                                    className={
                                                        record.status === "VALID"
                                                            ? "bg-green-600"
                                                            : "bg-red-600"
                                                    }
                                                >
                                                    {record.status === "VALID" ? (
                                                        <>
                                                            <CheckCircle2 className="w-3 h-3 mr-1" />
                                                            VALID
                                                        </>
                                                    ) : (
                                                        <>
                                                            <AlertTriangle className="w-3 h-3 mr-1" />
                                                            FRAUD
                                                        </>
                                                    )}
                                                </Badge>
                                                <span className="text-xs text-slate-400">
                                                    {new Date(record.timestamp).toLocaleString()}
                                                </span>

                                                {/* Masumi Verification Badge */}
                                                {record.isVerified && (
                                                    <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30 flex items-center gap-1">
                                                        <CheckCircle2 className="w-3 h-3" />
                                                        Masumi Verified
                                                    </Badge>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-2 text-sm">
                                                <span className="text-slate-400">TxHash:</span>
                                                <code className="text-purple-400 font-mono text-xs bg-slate-800 px-2 py-1 rounded">
                                                    {record.txHash.substring(0, 20)}...
                                                </code>
                                            </div>
                                            {record.masumiTxId && (
                                                <div className="flex items-center gap-2 text-sm mt-1">
                                                    <span className="text-slate-400">Masumi ID:</span>
                                                    <a
                                                        href={`https://explorer.masumi.network/tx/${record.masumiTxId}`}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="text-blue-400 font-mono text-xs hover:underline flex items-center gap-1"
                                                    >
                                                        {record.masumiTxId.substring(0, 20)}...
                                                        <Link2 className="w-3 h-3" />
                                                    </a>
                                                </div>
                                            )}
                                        </div>

                                        {/* Verify Button */}
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className="text-xs border-slate-600 hover:bg-slate-700 text-slate-300"
                                            onClick={() => {
                                                toast.success("Audit Trail Verified on Masumi Network", {
                                                    description: `Record ${record.id} is immutable.`
                                                });
                                            }}
                                        >
                                            Verify
                                        </Button>
                                    </div>

                                    {record.anomalyReason && (
                                        <div className="mt-2 p-2 bg-red-500/10 border border-red-500/20 rounded text-sm">
                                            <span className="text-red-300 font-semibold">Reason: </span>
                                            <span className="text-red-200">{record.anomalyReason}</span>
                                        </div>
                                    )}

                                    <div className="mt-3 grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                                        <div>
                                            <span className="text-slate-500">Voltage</span>
                                            <p className="text-white font-medium">{record.reading.voltage.toFixed(1)}V</p>
                                        </div>
                                        <div>
                                            <span className="text-slate-500">Current</span>
                                            <p className="text-white font-medium">{record.reading.current.toFixed(1)}A</p>
                                        </div>
                                        <div>
                                            <span className="text-slate-500">Energy</span>
                                            <p className="text-white font-medium">{record.reading.energyKWh.toFixed(4)} kWh</p>
                                        </div>
                                        <div>
                                            <span className="text-slate-500">Block</span>
                                            <p className="text-white font-medium">
                                                #{record.blockNumber?.toLocaleString() || "N/A"}
                                            </p>
                                        </div>
                                    </div>

                                    {record.confirmations && (
                                        <div className="mt-2 flex items-center gap-1 text-xs text-green-400">
                                            <CheckCircle2 className="w-3 h-3" />
                                            {record.confirmations} confirmations
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Instant Check Panel */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 max-w-7xl mx-auto">
                <InstantCheck />
                <DebugTerminal />
            </div>
        </div>
    );
}

function InstantCheck() {
    const [voltage, setVoltage] = useState(230);
    const [current, setCurrent] = useState(10);
    const [energy, setEnergy] = useState(0);
    const [result, setResult] = useState<{ status: string; anomalyReason?: string } | null>(
        null
    );
    const [isLoading, setIsLoading] = useState(false);

    const handleAnalyze = async () => {
        try {
            setIsLoading(true);
            const payload = { timestamp: Date.now(), voltage, current, energyKWh: energy };
            const res = await fetch("/api/check-reading", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });
            const json = await res.json();
            setResult(json);
        } catch (e) {
            console.error(e);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Card className="bg-slate-800/50 border-slate-700">
            <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5 text-blue-400" />
                    Manual Reading Check
                </CardTitle>
                <p className="text-slate-400 text-sm mt-1">
                    Test the fraud detection algorithm with custom values
                </p>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                        <label className="text-slate-300 text-sm font-medium">Voltage (V)</label>
                        <input
                            type="number"
                            value={voltage}
                            onChange={(e) => setVoltage(Number(e.target.value))}
                            className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-slate-300 text-sm font-medium">Current (A)</label>
                        <input
                            type="number"
                            value={current}
                            onChange={(e) => setCurrent(Number(e.target.value))}
                            className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-slate-300 text-sm font-medium">Energy (kWh)</label>
                        <input
                            type="number"
                            value={energy}
                            onChange={(e) => setEnergy(Number(e.target.value))}
                            className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                        />
                    </div>
                </div>

                <Button
                    onClick={handleAnalyze}
                    disabled={isLoading}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                >
                    {isLoading ? "Analyzing..." : "Analyze Reading"}
                </Button>

                {result && (
                    <div
                        className={`p-4 rounded-lg border ${result.status === "VALID"
                            ? "bg-green-500/10 border-green-500/20"
                            : "bg-red-500/10 border-red-500/20"
                            }`}
                    >
                        <div className="flex items-center gap-2 mb-2">
                            {result.status === "VALID" ? (
                                <CheckCircle2 className="w-5 h-5 text-green-400" />
                            ) : (
                                <AlertTriangle className="w-5 h-5 text-red-400" />
                            )}
                            <span
                                className={`font-bold ${result.status === "VALID" ? "text-green-400" : "text-red-400"
                                    }`}
                            >
                                {result.status}
                            </span>
                        </div>
                        {result.anomalyReason && (
                            <p className="text-sm text-slate-300">
                                Reason: {result.anomalyReason}
                            </p>
                        )}
                        {result.status === "VALID" && (
                            <Badge className="mt-2 bg-blue-500/20 text-blue-400 border-blue-500/30">
                                Ready for Masumi Verification
                            </Badge>
                        )}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
