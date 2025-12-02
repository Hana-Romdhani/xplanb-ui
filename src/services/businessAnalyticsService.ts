import { api } from '../lib/api';

export interface ProductivityScore {
    userId: string;
    userName: string;
    score: number;
    metrics: {
        documentsCreated: number;
        versionsCreated: number;
        commentsAdded: number;
        meetingsAttended: number;
        collaborationScore: number;
    };
    insights: string[];
}

export interface CollaborationHealth {
    overallScore: number;
    teamCollaboration: {
        crossTeamWork: number;
        sharedDocuments: number;
        activeCollaborations: number;
    };
    bottlenecks: Array<{
        type: 'silo' | 'inactive' | 'overloaded';
        description: string;
        users: string[];
    }>;
    recommendations: string[];
}

export interface SmartRecommendation {
    type: 'productivity' | 'collaboration' | 'efficiency' | 'engagement';
    priority: 'high' | 'medium' | 'low';
    title: string;
    description: string;
    action: string;
    impact: string;
    users: string[];
}

export interface ROIMetrics {
    timeSaved: number;
    efficiencyGain: number;
    collaborationIncrease: number;
    documentCompletionRate: number;
    costSavings: number;
    beforeAfterComparison: {
        before: {
            avgDocumentTime: number;
            collaborationRate: number;
            completionRate: number;
        };
        after: {
            avgDocumentTime: number;
            collaborationRate: number;
            completionRate: number;
        };
    };
}

export interface DocumentLifecycle {
    stage: 'creation' | 'collaboration' | 'review' | 'completion' | 'archived';
    count: number;
    avgTimeInStage: number;
    bottlenecks: Array<{
        stage: string;
        avgTime: number;
        description: string;
    }>;
}

export interface TeamPerformanceInsights {
    topPerformers: {
        users: Array<{
            name: string;
            score: number;
            strengths: string[];
        }>;
        averageScore: number;
    };
    improvementAreas: {
        users: Array<{
            name: string;
            score: number;
            needs: string[];
        }>;
        averageScore: number;
    };
    teamHealth: {
        collaborationScore: number;
        bottlenecks: number;
        recommendations: number;
    };
    businessImpact: {
        timeSaved: number;
        efficiencyGain: number;
        costSavings: number;
    };
}

export interface BusinessAnalyticsData {
    productivityScores: ProductivityScore[];
    collaborationHealth: CollaborationHealth;
    smartRecommendations: SmartRecommendation[];
    roiMetrics: ROIMetrics;
    documentLifecycle: DocumentLifecycle[];
    teamPerformance: TeamPerformanceInsights;
}

export class BusinessAnalyticsService {
    static async getProductivityScores(): Promise<ProductivityScore[]> {
        try {
            const response = await api.get('/analytics/productivity-scores');
            return response.data;
        } catch (error: any) {
            console.error('Error fetching productivity scores:', error);
            throw error;
        }
    }

    static async getCollaborationHealth(): Promise<CollaborationHealth> {
        try {
            const response = await api.get('/analytics/collaboration-health');
            return response.data;
        } catch (error: any) {
            console.error('Error fetching collaboration health:', error);
            throw error;
        }
    }

    static async getSmartRecommendations(): Promise<SmartRecommendation[]> {
        try {
            const response = await api.get('/analytics/smart-recommendations');
            return response.data;
        } catch (error: any) {
            console.error('Error fetching smart recommendations:', error);
            throw error;
        }
    }

    static async getROIMetrics(): Promise<ROIMetrics> {
        try {
            const response = await api.get('/analytics/roi-metrics');
            return response.data;
        } catch (error: any) {
            console.error('Error fetching ROI metrics:', error);
            throw error;
        }
    }

    static async getDocumentLifecycle(): Promise<DocumentLifecycle[]> {
        try {
            const response = await api.get('/analytics/document-lifecycle');
            return response.data;
        } catch (error: any) {
            console.error('Error fetching document lifecycle:', error);
            throw error;
        }
    }

    static async getTeamPerformanceInsights(): Promise<TeamPerformanceInsights> {
        try {
            const response = await api.get('/analytics/team-performance');
            return response.data;
        } catch (error: any) {
            console.error('Error fetching team performance insights:', error);
            throw error;
        }
    }

    static async getAllBusinessAnalytics(): Promise<BusinessAnalyticsData> {
        try {
            const [
                productivityScores,
                collaborationHealth,
                smartRecommendations,
                roiMetrics,
                documentLifecycle,
                teamPerformance,
            ] = await Promise.all([
                this.getProductivityScores(),
                this.getCollaborationHealth(),
                this.getSmartRecommendations(),
                this.getROIMetrics(),
                this.getDocumentLifecycle(),
                this.getTeamPerformanceInsights(),
            ]);

            return {
                productivityScores,
                collaborationHealth,
                smartRecommendations,
                roiMetrics,
                documentLifecycle,
                teamPerformance,
            };
        } catch (error) {
            console.error('Error fetching business analytics:', error);
            throw error;
        }
    }
}

