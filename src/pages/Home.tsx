import { useState, useEffect } from 'react'
import { callAIAgent } from '@/utils/aiAgent'
import type { NormalizedAgentResponse } from '@/utils/aiAgent'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Progress } from '@/components/ui/progress'
import {
  MessageCircle,
  Send,
  AlertCircle,
  CheckCircle,
  XCircle,
  Clock,
  MapPin,
  Smartphone,
  TrendingUp,
  Filter,
  Search,
  ChevronRight,
  AlertTriangle,
  DollarSign,
  Calendar,
  Users,
  FileText,
  Loader2,
  X,
  ArrowLeft,
  Bot,
  User,
  ThumbsUp,
  ThumbsDown,
  Info
} from 'lucide-react'
import { cn } from '@/lib/utils'

// Agent IDs
const AGENT_IDS = {
  CASE_MANAGER: '697ebdccd36f070193f5dfb2',
  MERCHANT_INTELLIGENCE: '697ebd81066158e77fde65a4',
  EVIDENCE_CORRELATOR: '697ebd97d36f070193f5dfb1',
  RISK_SCORING: '697ebdaf066158e77fde65ab',
  RESOLUTION: '697ebde7066158e77fde65b5'
}

// Varo color palette
const VARO_COLORS = {
  green: '#00D4AA',
  amber: '#F59E0B',
  red: '#EF4444'
}

// Helper function to parse nested JSON responses
function parseNestedResponse(result: any): any {
  try {
    // If raw_response exists and contains nested JSON string
    if (result.raw_response) {
      const rawData = JSON.parse(result.raw_response)

      // Check if response field contains a JSON string
      if (rawData.response && typeof rawData.response === 'string') {
        const innerData = JSON.parse(rawData.response)
        return innerData.result || innerData
      }
    }

    // Return the original result.response.result
    return result.response?.result || {}
  } catch (e) {
    console.error('Error parsing nested response:', e)
    return result.response?.result || {}
  }
}

// TypeScript Interfaces from Response Schemas

// Merchant Intelligence Agent Response
interface MerchantIntelligenceResult {
  decoded_merchant_name: string
  merchant_category: string
  is_recurring_charge: boolean
  subscription_pattern: {
    detected: boolean
    frequency: string | null
    last_charges: any[]
  }
  merchant_metadata: {
    location: string
    business_type: string
    network_data: string
  }
  confidence_score: number
}

// Evidence Correlator Agent Response
interface EvidenceCorrelatorResult {
  location_match: {
    gps_near_merchant: boolean
    distance_miles: number
    time_correlation: string
  }
  device_analysis: {
    device_fingerprint_match: boolean
    device_name: string | null
    previously_used: boolean
    session_count: number
  }
  authorized_user_analysis: {
    possible_family_member: boolean
    identified_user: string | null
    evidence: string | null
  }
  evidence_strength: string
  summary: string
}

// Risk Scoring Agent Response
interface RiskScoringResult {
  friendly_fraud_score: number
  risk_level: string
  account_analysis: {
    account_age_days: number
    deposit_pattern: string
    avg_monthly_deposits: number
    account_health: string
  }
  dispute_history: {
    total_disputes: number
    disputes_won: number
    disputes_lost: number
    recent_dispute_count_90d: number
    pattern: string
  }
  fraud_database_findings: {
    flags_found: boolean
    severity: string
    details: string
  }
  risk_factors: string[]
  recommendation: string
}

// Resolution Agent Response
interface ResolutionResult {
  resolution_type: string
  actions_taken: string[]
  chargeback_details: {
    filed: boolean
    network: string
    reason_code: string
    reason_description: string
    filing_date: string
    expected_resolution_date: string
  }
  credit_details: {
    processed: boolean
    amount: number
    transaction_id: string
    posted_date: string | null
  }
  tracking: {
    case_id: string
    status: string
    timeline_days: number
    next_action_date: string
  }
  customer_notification: string
}

// Case Manager Agent Response
interface CaseManagerResult {
  final_output: any
  sub_agent_results: Array<{
    agent_name: string
    status: string
    output: any
  }>
  summary: string
  workflow_completed: boolean
}

// Mock Data Types
interface Transaction {
  id: string
  merchant: string
  amount: number
  date: string
  time: string
  status: string
  category: string
  location: string
}

interface ChatMessage {
  id: string
  sender: 'user' | 'agent'
  message: string
  timestamp: string
}

interface Case {
  id: string
  transaction: Transaction
  status: 'open' | 'pending' | 'resolved' | 'denied'
  risk_score: number
  risk_level: 'low' | 'medium' | 'high'
  created_at: string
  due_date: string
  analyst?: string
  evidence?: {
    merchant?: MerchantIntelligenceResult
    correlation?: EvidenceCorrelatorResult
    risk?: RiskScoringResult
  }
}

type Screen = 'intake' | 'dashboard' | 'detail'

// Mock transaction data
const mockTransaction: Transaction = {
  id: 'TXN-2026-001234',
  merchant: 'SQ *COFFEE SHOP',
  amount: 47.82,
  date: '2026-01-28',
  time: '14:32',
  status: 'posted',
  category: 'Food & Drink',
  location: 'San Francisco, CA'
}

// Mock cases for dashboard
const generateMockCases = (): Case[] => [
  {
    id: 'CASE-001',
    transaction: {
      id: 'TXN-001',
      merchant: 'AMZN Mktp US',
      amount: 129.99,
      date: '2026-01-30',
      time: '09:15',
      status: 'posted',
      category: 'Shopping',
      location: 'Online'
    },
    status: 'open',
    risk_score: 72,
    risk_level: 'high',
    created_at: '2026-01-30T10:00:00Z',
    due_date: '2026-02-13',
    analyst: 'Sarah Chen'
  },
  {
    id: 'CASE-002',
    transaction: {
      id: 'TXN-002',
      merchant: 'NETFLIX.COM',
      amount: 15.99,
      date: '2026-01-29',
      time: '12:00',
      status: 'posted',
      category: 'Entertainment',
      location: 'Online'
    },
    status: 'pending',
    risk_score: 35,
    risk_level: 'low',
    created_at: '2026-01-29T14:30:00Z',
    due_date: '2026-02-12',
    analyst: 'Marcus Williams'
  },
  {
    id: 'CASE-003',
    transaction: {
      id: 'TXN-003',
      merchant: 'UBER *TRIP',
      amount: 24.50,
      date: '2026-01-28',
      time: '22:45',
      status: 'posted',
      category: 'Transportation',
      location: 'Los Angeles, CA'
    },
    status: 'open',
    risk_score: 58,
    risk_level: 'medium',
    created_at: '2026-01-29T08:00:00Z',
    due_date: '2026-02-11',
    analyst: 'Sarah Chen'
  }
]

// Sub-components
function TransactionCard({ transaction }: { transaction: Transaction }) {
  return (
    <Card className="border-2" style={{ borderColor: VARO_COLORS.green }}>
      <CardContent className="p-4">
        <div className="flex justify-between items-start mb-2">
          <div>
            <p className="font-semibold text-gray-900">{transaction.merchant}</p>
            <p className="text-sm text-gray-500">{transaction.category}</p>
          </div>
          <p className="text-xl font-bold text-gray-900">${transaction.amount.toFixed(2)}</p>
        </div>
        <div className="flex items-center gap-4 text-sm text-gray-600">
          <span className="flex items-center gap-1">
            <Calendar className="w-4 h-4" />
            {transaction.date}
          </span>
          <span className="flex items-center gap-1">
            <Clock className="w-4 h-4" />
            {transaction.time}
          </span>
          <span className="flex items-center gap-1">
            <MapPin className="w-4 h-4" />
            {transaction.location}
          </span>
        </div>
      </CardContent>
    </Card>
  )
}

function ChatBubble({ message }: { message: ChatMessage }) {
  const isAgent = message.sender === 'agent'
  return (
    <div className={cn('flex gap-3 mb-4', isAgent ? 'flex-row' : 'flex-row-reverse')}>
      <div className={cn('w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0',
        isAgent ? 'bg-green-100' : 'bg-gray-200')}>
        {isAgent ? <Bot className="w-5 h-5" style={{ color: VARO_COLORS.green }} /> : <User className="w-5 h-5 text-gray-600" />}
      </div>
      <div className={cn('max-w-[75%] rounded-2xl px-4 py-2',
        isAgent ? 'bg-gray-100 text-gray-900' : 'text-white')}
        style={!isAgent ? { backgroundColor: VARO_COLORS.green } : {}}>
        <p className="text-sm">{message.message}</p>
        <p className={cn('text-xs mt-1', isAgent ? 'text-gray-500' : 'text-green-100')}>
          {message.timestamp}
        </p>
      </div>
    </div>
  )
}

function QuickReplyChips({ onSelect }: { onSelect: (text: string) => void }) {
  const quickReplies = [
    "I don't recognize this charge",
    "My card was stolen",
    "I cancelled this subscription",
    "I never received the item"
  ]

  return (
    <div className="flex flex-wrap gap-2">
      {quickReplies.map((reply, i) => (
        <Button
          key={i}
          variant="outline"
          size="sm"
          onClick={() => onSelect(reply)}
          className="rounded-full text-xs"
          style={{ borderColor: VARO_COLORS.green, color: VARO_COLORS.green }}
        >
          {reply}
        </Button>
      ))}
    </div>
  )
}

function RiskBadge({ score, level }: { score: number; level: string }) {
  const getColor = () => {
    if (score >= 70) return VARO_COLORS.red
    if (score >= 40) return VARO_COLORS.amber
    return VARO_COLORS.green
  }

  return (
    <Badge variant="outline" style={{ borderColor: getColor(), color: getColor() }}>
      {level.toUpperCase()} ({score})
    </Badge>
  )
}

function CaseRow({ caseData, onClick }: { caseData: Case; onClick: () => void }) {
  const getDaysUntilDue = () => {
    const due = new Date(caseData.due_date)
    const now = new Date()
    const days = Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    return days
  }

  const daysUntilDue = getDaysUntilDue()

  return (
    <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={onClick}>
      <CardContent className="p-4">
        <div className="flex justify-between items-start mb-2">
          <div className="flex-1">
            <p className="font-semibold text-gray-900">{caseData.transaction.merchant}</p>
            <p className="text-sm text-gray-500">{caseData.id}</p>
          </div>
          <RiskBadge score={caseData.risk_score} level={caseData.risk_level} />
        </div>
        <div className="flex justify-between items-center text-sm">
          <span className="font-bold text-gray-900">${caseData.transaction.amount.toFixed(2)}</span>
          <span className={cn('flex items-center gap-1',
            daysUntilDue <= 3 ? 'text-red-600' : 'text-gray-600')}>
            <Clock className="w-4 h-4" />
            {daysUntilDue}d left
          </span>
        </div>
      </CardContent>
    </Card>
  )
}

function StatCard({ icon: Icon, label, value, color }: {
  icon: any;
  label: string;
  value: string | number;
  color: string
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg flex items-center justify-center"
            style={{ backgroundColor: `${color}20` }}>
            <Icon className="w-5 h-5" style={{ color }} />
          </div>
          <div>
            <p className="text-sm text-gray-500">{label}</p>
            <p className="text-2xl font-bold text-gray-900">{value}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// SCREEN 1: Customer Dispute Intake
function IntakeScreen({ onComplete }: { onComplete: (caseData: Case) => void }) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      sender: 'agent',
      message: "Hi! I'm here to help you with your dispute. Can you tell me more about this charge you don't recognize?",
      timestamp: new Date().toLocaleTimeString()
    }
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [progress, setProgress] = useState(33) // intake stage
  const [evidencePreview, setEvidencePreview] = useState<{
    merchant?: MerchantIntelligenceResult
    correlation?: EvidenceCorrelatorResult
    risk?: RiskScoringResult
  }>({})

  const handleSend = async () => {
    if (!input.trim() || loading) return

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      sender: 'user',
      message: input,
      timestamp: new Date().toLocaleTimeString()
    }

    setMessages(prev => [...prev, userMessage])
    const currentInput = input
    setInput('')
    setLoading(true)

    try {
      // Call Case Manager Agent
      const result = await callAIAgent(
        `Transaction: ${mockTransaction.merchant} $${mockTransaction.amount} on ${mockTransaction.date}. Customer says: ${currentInput}`,
        AGENT_IDS.CASE_MANAGER
      )

      // Parse the response - handle nested JSON string
      const parsedResult = parseNestedResponse(result)

      // Debug logging
      console.log('=== Case Manager Response Debug ===')
      console.log('Full result:', result)
      console.log('Parsed result:', parsedResult)

      if (result.success && result.response.status === 'success') {
        let agentMessage = "Thank you for that information. I'm analyzing the transaction now..."

        // Try to extract meaningful message from the response
        if (parsedResult.case_summary) {
          // If we have a case summary, show merchant analysis or dispute reason
          agentMessage = parsedResult.case_summary.merchant_analysis ||
                        parsedResult.case_summary.dispute_reason ||
                        "I've completed the initial analysis. Let me gather more evidence..."
        } else if (parsedResult.summary) {
          agentMessage = parsedResult.summary
        } else if (parsedResult.interviewer_notes) {
          agentMessage = parsedResult.interviewer_notes
        }

        const agentResponse: ChatMessage = {
          id: (Date.now() + 1).toString(),
          sender: 'agent',
          message: agentMessage,
          timestamp: new Date().toLocaleTimeString()
        }
        setMessages(prev => [...prev, agentResponse])
        setProgress(66) // investigation stage

        // Update evidence preview if we have case summary
        if (parsedResult.case_summary) {
          setEvidencePreview({
            gps_match: parsedResult.case_summary.evidence_findings?.includes('GPS') || false,
            device_match: parsedResult.case_summary.evidence_findings?.includes('device') || false,
            merchant_decoded: parsedResult.case_summary.merchant_analysis || 'Analysis in progress...',
            risk_score: parsedResult.case_summary.overall_fraud_likelihood_score || 0
          })
        }
      } else {
        const agentResponse: ChatMessage = {
          id: (Date.now() + 1).toString(),
          sender: 'agent',
          message: "Thank you for providing those details. Let me gather some information about this transaction. Have you made any purchases at this merchant before?",
          timestamp: new Date().toLocaleTimeString()
        }
        setMessages(prev => [...prev, agentResponse])
      }
    } catch (error) {
      console.error('Agent call error:', error)
      const errorMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        sender: 'agent',
        message: "I understand. Let me help you investigate this charge further.",
        timestamp: new Date().toLocaleTimeString()
      }
      setMessages(prev => [...prev, errorMessage])
    } finally {
      setLoading(false)
    }
  }

  const handleQuickReply = (text: string) => {
    setInput(text)
    setTimeout(() => handleSend(), 100)
  }

  const handleSubmit = () => {
    setProgress(100)
    const newCase: Case = {
      id: `CASE-${Date.now()}`,
      transaction: mockTransaction,
      status: 'open',
      risk_score: 58,
      risk_level: 'medium',
      created_at: new Date().toISOString(),
      due_date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
      evidence: evidencePreview
    }
    onComplete(newCase)
  }

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Header */}
      <div className="p-4 border-b bg-white sticky top-0 z-10">
        <div className="flex items-center justify-between mb-3">
          <h1 className="text-lg font-bold text-gray-900">Dispute a Charge</h1>
          <Button variant="ghost" size="sm">
            <X className="w-5 h-5" />
          </Button>
        </div>
        <Progress value={progress} className="h-2" style={{ backgroundColor: '#E5E7EB' }}>
          <div className="h-full transition-all" style={{
            width: `${progress}%`,
            backgroundColor: VARO_COLORS.green
          }} />
        </Progress>
        <div className="flex justify-between text-xs text-gray-500 mt-1">
          <span className={progress >= 33 ? 'font-semibold' : ''}>Intake</span>
          <span className={progress >= 66 ? 'font-semibold' : ''}>Investigation</span>
          <span className={progress >= 100 ? 'font-semibold' : ''}>Review</span>
        </div>
      </div>

      {/* Transaction Card (Pinned) */}
      <div className="p-4 bg-gray-50 border-b">
        <TransactionCard transaction={mockTransaction} />
      </div>

      {/* Chat Messages */}
      <ScrollArea className="flex-1 p-4">
        <div className="max-w-2xl mx-auto">
          {messages.map(msg => (
            <ChatBubble key={msg.id} message={msg} />
          ))}
          {loading && (
            <div className="flex gap-3 mb-4">
              <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 bg-green-100">
                <Bot className="w-5 h-5" style={{ color: VARO_COLORS.green }} />
              </div>
              <div className="bg-gray-100 rounded-2xl px-4 py-2">
                <Loader2 className="w-5 h-5 animate-spin" style={{ color: VARO_COLORS.green }} />
              </div>
            </div>
          )}

          {/* Evidence Preview Cards */}
          {Object.keys(evidencePreview).length > 0 && (
            <div className="mt-4 space-y-2">
              <p className="text-sm font-semibold text-gray-700">Investigation Progress:</p>
              {evidencePreview.merchant && (
                <Card className="bg-green-50">
                  <CardContent className="p-3">
                    <div className="flex items-start gap-2">
                      <CheckCircle className="w-5 h-5 mt-0.5" style={{ color: VARO_COLORS.green }} />
                      <div>
                        <p className="text-sm font-semibold text-gray-900">Merchant Identified</p>
                        <p className="text-xs text-gray-600">{evidencePreview.merchant.decoded_merchant_name}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Quick Replies */}
      {messages.length <= 3 && (
        <div className="p-4 border-t bg-white">
          <p className="text-xs text-gray-500 mb-2">Quick replies:</p>
          <QuickReplyChips onSelect={handleQuickReply} />
        </div>
      )}

      {/* Input Area */}
      <div className="p-4 border-t bg-white">
        <div className="flex gap-2 mb-3">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Type your message..."
            className="flex-1"
            disabled={loading}
          />
          <Button
            onClick={handleSend}
            disabled={!input.trim() || loading}
            className="text-white"
            style={{ backgroundColor: VARO_COLORS.green }}
          >
            <Send className="w-5 h-5" />
          </Button>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2">
          <Button
            onClick={handleSubmit}
            className="flex-1 text-white"
            style={{ backgroundColor: VARO_COLORS.green }}
            disabled={messages.length < 3}
          >
            Submit Dispute
          </Button>
          <Button variant="outline" className="flex-1 text-gray-700 border-gray-300">
            Cancel - I Recognize This
          </Button>
        </div>
      </div>
    </div>
  )
}

// SCREEN 2: Analyst Review Dashboard
function DashboardScreen({ onCaseSelect }: { onCaseSelect: (caseData: Case) => void }) {
  const [cases, setCases] = useState<Case[]>(generateMockCases())
  const [selectedCase, setSelectedCase] = useState<Case | null>(cases[0])
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [riskFilter, setRiskFilter] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')

  const stats = {
    openCases: cases.filter(c => c.status === 'open').length,
    dueToday: cases.filter(c => {
      const due = new Date(c.due_date)
      const today = new Date()
      return due.toDateString() === today.toDateString()
    }).length,
    avgResolutionTime: 3.2,
    friendlyFraudRate: 12.5
  }

  const filteredCases = cases.filter(c => {
    if (statusFilter !== 'all' && c.status !== statusFilter) return false
    if (riskFilter !== 'all' && c.risk_level !== riskFilter) return false
    if (searchQuery && !c.transaction.merchant.toLowerCase().includes(searchQuery.toLowerCase())) return false
    return true
  })

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b p-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">Dispute Review Dashboard</h1>

        {/* Stats Row */}
        <div className="grid grid-cols-4 gap-4">
          <StatCard icon={FileText} label="Open Cases" value={stats.openCases} color={VARO_COLORS.green} />
          <StatCard icon={AlertCircle} label="Due Today (Reg E)" value={stats.dueToday} color={VARO_COLORS.amber} />
          <StatCard icon={Clock} label="Avg Resolution" value={`${stats.avgResolutionTime}d`} color="#6366F1" />
          <StatCard icon={TrendingUp} label="Friendly Fraud Rate" value={`${stats.friendlyFraudRate}%`} color={VARO_COLORS.red} />
        </div>
      </div>

      {/* Three-column layout */}
      <div className="flex h-[calc(100vh-200px)]">
        {/* Left: Case Queue (25%) */}
        <div className="w-1/4 border-r bg-white p-4 overflow-y-auto">
          <div className="mb-4">
            <div className="flex items-center gap-2 mb-3">
              <Search className="w-4 h-4 text-gray-400" />
              <Input
                placeholder="Search cases..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex-1"
              />
            </div>
            <div className="flex gap-2">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="open">Open</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="resolved">Resolved</SelectItem>
                </SelectContent>
              </Select>
              <Select value={riskFilter} onValueChange={setRiskFilter}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Risk" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Risk</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            {filteredCases.map(c => (
              <CaseRow
                key={c.id}
                caseData={c}
                onClick={() => setSelectedCase(c)}
              />
            ))}
          </div>
        </div>

        {/* Center: Case Preview (50%) */}
        <div className="w-1/2 p-6 overflow-y-auto">
          {selectedCase ? (
            <div className="space-y-4">
              <div className="flex justify-between items-start">
                <div>
                  <h2 className="text-xl font-bold text-gray-900">{selectedCase.id}</h2>
                  <p className="text-sm text-gray-500">Created {new Date(selectedCase.created_at).toLocaleDateString()}</p>
                </div>
                <RiskBadge score={selectedCase.risk_score} level={selectedCase.risk_level} />
              </div>

              <TransactionCard transaction={selectedCase.transaction} />

              {/* Evidence Summary */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Evidence Summary</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-start gap-3">
                    <MapPin className="w-5 h-5 text-gray-500 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-gray-900">GPS Correlation</p>
                      <p className="text-sm text-gray-600">User was 0.3 miles from merchant at time of transaction</p>
                      <div className="h-32 bg-gray-100 rounded mt-2 flex items-center justify-center">
                        <p className="text-xs text-gray-400">Mini GPS Map</p>
                      </div>
                    </div>
                  </div>

                  <Separator />

                  <div className="flex items-start gap-3">
                    <Smartphone className="w-5 h-5 text-gray-500 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-gray-900">Device Match</p>
                      <p className="text-sm text-gray-600">
                        <span style={{ color: VARO_COLORS.green }} className="font-semibold">✓ Matched</span> - iPhone 13 Pro (user's primary device)
                      </p>
                    </div>
                  </div>

                  <Separator />

                  <div className="flex items-start gap-3">
                    <TrendingUp className="w-5 h-5 text-gray-500 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-gray-900">Merchant History</p>
                      <p className="text-sm text-gray-600">3 previous transactions with this merchant in last 60 days</p>
                      <div className="h-24 bg-gray-100 rounded mt-2 flex items-center justify-center">
                        <p className="text-xs text-gray-400">Transaction History Chart</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* AI Recommendation */}
              <Card className="border-2" style={{ borderColor: VARO_COLORS.amber }}>
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 mt-0.5" style={{ color: VARO_COLORS.amber }} />
                    <div>
                      <p className="font-semibold text-gray-900 mb-1">AI Recommendation</p>
                      <p className="text-sm text-gray-700">
                        REVIEW REQUIRED - Evidence suggests possible friendly fraud. Customer has device match and GPS correlation,
                        but claims non-recognition. Recommend analyst interview before decision.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Button
                onClick={() => onCaseSelect(selectedCase)}
                className="w-full text-white"
                style={{ backgroundColor: VARO_COLORS.green }}
              >
                View Full Case Details
                <ChevronRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          ) : (
            <div className="flex items-center justify-center h-full text-gray-400">
              Select a case to preview
            </div>
          )}
        </div>

        {/* Right: Quick Actions (25%) */}
        <div className="w-1/4 border-l bg-white p-4">
          <h3 className="font-bold text-gray-900 mb-4">Quick Actions</h3>
          {selectedCase ? (
            <div className="space-y-2">
              <Button
                className="w-full justify-start text-white"
                style={{ backgroundColor: VARO_COLORS.green }}
              >
                <ThumbsUp className="w-4 h-4 mr-2" />
                Approve Credit
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start text-gray-700 border-gray-300"
              >
                <ThumbsDown className="w-4 h-4 mr-2" />
                Deny with Explanation
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start text-gray-700 border-gray-300"
              >
                <MessageCircle className="w-4 h-4 mr-2" />
                Request More Info
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start text-gray-700 border-gray-300"
              >
                <AlertCircle className="w-4 h-4 mr-2" />
                Escalate to Senior
              </Button>

              <Separator className="my-4" />

              <div className="space-y-2">
                <p className="text-sm font-semibold text-gray-700">Case Details</p>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Assigned to:</span>
                    <span className="text-gray-900">{selectedCase.analyst || 'Unassigned'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Status:</span>
                    <Badge variant="outline">{selectedCase.status}</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Due Date:</span>
                    <span className="text-gray-900">{new Date(selectedCase.due_date).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <p className="text-sm text-gray-400">Select a case to see actions</p>
          )}
        </div>
      </div>
    </div>
  )
}

// SCREEN 3: Case Detail View
function DetailScreen({ caseData, onBack }: { caseData: Case; onBack: () => void }) {
  const [activeTab, setActiveTab] = useState('summary')
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)
  const [resolution, setResolution] = useState<ResolutionResult | null>(null)

  const handleResolve = async (action: 'approve' | 'deny') => {
    setLoading(true)
    try {
      const result = await callAIAgent(
        `Resolve case ${caseData.id} with action: ${action}. Transaction: ${caseData.transaction.merchant} $${caseData.transaction.amount}`,
        AGENT_IDS.RESOLUTION
      )

      // Parse the response - handle nested JSON string
      const parsedResult = parseNestedResponse(result)

      console.log('=== Resolution Response Debug ===')
      console.log('Full result:', result)
      console.log('Parsed result:', parsedResult)

      if (result.success && result.response.status === 'success') {
        setResolution(parsedResult as ResolutionResult)
      }
    } catch (error) {
      console.error('Resolution error:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b p-6">
        <div className="flex items-center gap-4 mb-4">
          <Button variant="ghost" size="sm" onClick={onBack}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-gray-900">{caseData.id}</h1>
            <p className="text-sm text-gray-500">Dispute Case Details</p>
          </div>
          <RiskBadge score={caseData.risk_score} level={caseData.risk_level} />
        </div>

        <TransactionCard transaction={caseData.transaction} />
      </div>

      {/* Tabbed Content */}
      <div className="p-6">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-4">
            <TabsTrigger value="summary">Summary</TabsTrigger>
            <TabsTrigger value="evidence">Evidence</TabsTrigger>
            <TabsTrigger value="timeline">Timeline</TabsTrigger>
            <TabsTrigger value="notes">Notes</TabsTrigger>
          </TabsList>

          <TabsContent value="summary" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Key Findings</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 mt-0.5" style={{ color: VARO_COLORS.green }} />
                  <div>
                    <p className="text-sm font-semibold text-gray-900">Device Fingerprint Match</p>
                    <p className="text-sm text-gray-600">Transaction made from customer's registered iPhone 13 Pro</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 mt-0.5" style={{ color: VARO_COLORS.green }} />
                  <div>
                    <p className="text-sm font-semibold text-gray-900">GPS Correlation</p>
                    <p className="text-sm text-gray-600">Customer was within 0.3 miles of merchant at transaction time</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 mt-0.5" style={{ color: VARO_COLORS.amber }} />
                  <div>
                    <p className="text-sm font-semibold text-gray-900">Purchase History</p>
                    <p className="text-sm text-gray-600">3 previous transactions at this merchant in last 60 days</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-2" style={{ borderColor: VARO_COLORS.amber }}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bot className="w-5 h-5" style={{ color: VARO_COLORS.amber }} />
                  AI Recommendation
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-700 mb-3">
                  Based on the evidence analysis, this appears to be a case of possible friendly fraud.
                  Strong device and location correlation suggests the customer authorized this transaction.
                </p>
                <div className="bg-amber-50 p-3 rounded">
                  <p className="text-sm font-semibold text-gray-900 mb-1">Recommendation: DENY</p>
                  <p className="text-xs text-gray-600">Confidence: 78%</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Quick Stats</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <p className="text-2xl font-bold" style={{ color: VARO_COLORS.amber }}>58</p>
                    <p className="text-xs text-gray-500">Fraud Risk Score</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-gray-900">3</p>
                    <p className="text-xs text-gray-500">Similar Transactions</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-gray-900">210</p>
                    <p className="text-xs text-gray-500">Account Age (days)</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="evidence" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="w-5 h-5" />
                  GPS Correlation Analysis
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="bg-gray-100 rounded h-64 flex items-center justify-center mb-4">
                  <p className="text-gray-400">GPS Map: Customer location vs Merchant location</p>
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-gray-500">Distance from merchant:</p>
                    <p className="font-semibold text-gray-900">0.3 miles</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Time correlation:</p>
                    <p className="font-semibold text-gray-900">Strong match</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Smartphone className="w-5 h-5" />
                  Device Fingerprint Comparison
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between items-center p-3 bg-green-50 rounded">
                    <div>
                      <p className="text-sm font-semibold text-gray-900">Transaction Device</p>
                      <p className="text-xs text-gray-600">iPhone 13 Pro - iOS 17.2</p>
                    </div>
                    <CheckCircle className="w-5 h-5" style={{ color: VARO_COLORS.green }} />
                  </div>
                  <div className="flex justify-between items-center p-3 bg-green-50 rounded">
                    <div>
                      <p className="text-sm font-semibold text-gray-900">Customer's Primary Device</p>
                      <p className="text-xs text-gray-600">iPhone 13 Pro - iOS 17.2</p>
                    </div>
                    <CheckCircle className="w-5 h-5" style={{ color: VARO_COLORS.green }} />
                  </div>
                  <p className="text-xs text-gray-500">
                    Device fingerprints match: same hardware ID, IP address pattern, and browser profile
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5" />
                  Merchant Transaction History
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="bg-gray-100 rounded h-48 flex items-center justify-center mb-4">
                  <p className="text-gray-400">Transaction history chart over time</p>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Total transactions:</span>
                    <span className="font-semibold text-gray-900">3</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Last 30 days:</span>
                    <span className="font-semibold text-gray-900">2</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Average amount:</span>
                    <span className="font-semibold text-gray-900">$42.15</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="timeline" className="space-y-3">
            <Card>
              <CardContent className="p-4">
                <div className="space-y-4">
                  {[
                    { time: '10:00 AM', event: 'Case created', icon: FileText, color: VARO_COLORS.green },
                    { time: '10:15 AM', event: 'Customer intake completed', icon: User, color: VARO_COLORS.green },
                    { time: '10:16 AM', event: 'Evidence correlation started', icon: Bot, color: '#6366F1' },
                    { time: '10:17 AM', event: 'GPS analysis completed', icon: MapPin, color: VARO_COLORS.green },
                    { time: '10:17 AM', event: 'Device fingerprint match confirmed', icon: Smartphone, color: VARO_COLORS.green },
                    { time: '10:18 AM', event: 'Risk score calculated: 58 (medium)', icon: AlertTriangle, color: VARO_COLORS.amber },
                    { time: '10:20 AM', event: 'Assigned to analyst Sarah Chen', icon: Users, color: VARO_COLORS.green }
                  ].map((item, i) => (
                    <div key={i} className="flex gap-3">
                      <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
                        style={{ backgroundColor: `${item.color}20` }}>
                        <item.icon className="w-4 h-4" style={{ color: item.color }} />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-gray-900">{item.event}</p>
                        <p className="text-xs text-gray-500">{item.time}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="notes">
            <Card>
              <CardHeader>
                <CardTitle>Analyst Notes</CardTitle>
                <CardDescription>Add your observations and analysis</CardDescription>
              </CardHeader>
              <CardContent>
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Enter your notes here..."
                  className="min-h-[200px] mb-4"
                />
                <Button className="text-white" style={{ backgroundColor: VARO_COLORS.green }}>
                  Save Notes
                </Button>
              </CardContent>
            </Card>

            {notes && (
              <Card className="mt-4">
                <CardHeader>
                  <CardTitle className="text-base">Previous Notes</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="p-3 bg-gray-50 rounded">
                      <p className="text-sm text-gray-700 mb-1">Customer seemed confused about merchant name during intake</p>
                      <p className="text-xs text-gray-500">Sarah Chen - 2 hours ago</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Sticky Action Bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t p-4">
        <div className="max-w-6xl mx-auto flex gap-3">
          <Button
            onClick={() => handleResolve('approve')}
            disabled={loading}
            className="flex-1 text-white"
            style={{ backgroundColor: VARO_COLORS.green }}
          >
            {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <ThumbsUp className="w-4 h-4 mr-2" />}
            Approve Credit
          </Button>
          <Button
            onClick={() => handleResolve('deny')}
            disabled={loading}
            className="flex-1 text-white"
            style={{ backgroundColor: VARO_COLORS.red }}
          >
            {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <ThumbsDown className="w-4 h-4 mr-2" />}
            Deny Dispute
          </Button>
          <Button variant="outline" className="flex-1">
            <MessageCircle className="w-4 h-4 mr-2" />
            Request More Info
          </Button>
        </div>
      </div>

      {/* Resolution Modal */}
      {resolution && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <Card className="max-w-md w-full">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5" style={{ color: VARO_COLORS.green }} />
                Resolution Processed
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <p className="text-sm text-gray-500">Resolution Type</p>
                <p className="font-semibold text-gray-900">{resolution.resolution_type}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Actions Taken</p>
                {resolution.actions_taken.map((action, i) => (
                  <p key={i} className="text-sm text-gray-700">• {action}</p>
                ))}
              </div>
              {resolution.credit_details.processed && (
                <div>
                  <p className="text-sm text-gray-500">Credit Amount</p>
                  <p className="font-semibold text-gray-900">${resolution.credit_details.amount}</p>
                </div>
              )}
              <div className="bg-blue-50 p-3 rounded">
                <p className="text-sm text-gray-700">{resolution.customer_notification}</p>
              </div>
              <Button
                onClick={() => setResolution(null)}
                className="w-full text-white"
                style={{ backgroundColor: VARO_COLORS.green }}
              >
                Close
              </Button>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}

// MAIN APP
export default function Home() {
  const [currentScreen, setCurrentScreen] = useState<Screen>('intake')
  const [selectedCase, setSelectedCase] = useState<Case | null>(null)

  const handleIntakeComplete = (caseData: Case) => {
    setSelectedCase(caseData)
    setCurrentScreen('dashboard')
  }

  const handleCaseSelect = (caseData: Case) => {
    setSelectedCase(caseData)
    setCurrentScreen('detail')
  }

  const handleBackToDashboard = () => {
    setCurrentScreen('dashboard')
  }

  // Navigation Bar
  const NavigationBar = () => (
    <div className="bg-white border-b px-6 py-3 flex items-center gap-6">
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded" style={{ backgroundColor: VARO_COLORS.green }} />
        <span className="font-bold text-gray-900">Varo Dispute Management</span>
      </div>
      <div className="flex gap-4 ml-auto">
        <Button
          variant={currentScreen === 'intake' ? 'default' : 'ghost'}
          onClick={() => setCurrentScreen('intake')}
          style={currentScreen === 'intake' ? { backgroundColor: VARO_COLORS.green, color: 'white' } : {}}
        >
          Customer Intake
        </Button>
        <Button
          variant={currentScreen === 'dashboard' ? 'default' : 'ghost'}
          onClick={() => setCurrentScreen('dashboard')}
          style={currentScreen === 'dashboard' ? { backgroundColor: VARO_COLORS.green, color: 'white' } : {}}
        >
          Dashboard
        </Button>
        {selectedCase && (
          <Button
            variant={currentScreen === 'detail' ? 'default' : 'ghost'}
            onClick={() => setCurrentScreen('detail')}
            style={currentScreen === 'detail' ? { backgroundColor: VARO_COLORS.green, color: 'white' } : {}}
          >
            Case Detail
          </Button>
        )}
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-50">
      {currentScreen !== 'intake' && <NavigationBar />}

      {currentScreen === 'intake' && <IntakeScreen onComplete={handleIntakeComplete} />}
      {currentScreen === 'dashboard' && <DashboardScreen onCaseSelect={handleCaseSelect} />}
      {currentScreen === 'detail' && selectedCase && (
        <DetailScreen caseData={selectedCase} onBack={handleBackToDashboard} />
      )}
    </div>
  )
}
