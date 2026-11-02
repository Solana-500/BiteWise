import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';


import { supabase } from '../services/supabase';
import CoachBottomTabBar from '../components/CoachBottomTabBar';
import { useCoachUnread } from '../context/CoachUnreadContext';


type Props = {
  navigation: any;
};


type CoachProfile = {
  full_name: string | null;
  coaching_specialty: string | null;
};


type ContentCounts = {
  pending: number;
  approved: number;
  changesRequested: number;
};


const EMPTY_CONTENT_COUNTS: ContentCounts = {
  pending: 0,
  approved: 0,
  changesRequested: 0,
};


export default function CoachHomeScreen({ navigation }: Props) {
  const { totalUnreadCount } = useCoachUnread();


  const [loading, setLoading] = useState(true);
  const [coachName, setCoachName] = useState('Coach');
  const [specialty, setSpecialty] = useState('');


  const [ratingsError, setRatingsError] = useState(false);


  const [latestRating, setLatestRating] = useState<{
    rating: number;
    review_text: string | null;
  } | null>(null);


  const [stats, setStats] = useState({
    clients: 0,
    pendingContent: 0,
    approvedContent: 0,
    changesRequestedContent: 0,
    recentRatings: 0,
  });


  const [contentCounts, setContentCounts] =
    useState<ContentCounts>(EMPTY_CONTENT_COUNTS);


  const loadContentCounts = useCallback(async () => {
  try {
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()


    if (userError) {
      throw userError
    }


    if (!user) {
      setContentCounts(EMPTY_CONTENT_COUNTS)
      return
    }


    const [mealResult, workoutResult, recipeResult] = await Promise.all([
      supabase
        .from('meal_plans')
        .select('status')
        .eq('coach_id', user.id),


      supabase
        .from('workout_plans')
        .select('status')
        .eq('coach_id', user.id),


      supabase
        .from('coach_recipes')
        .select('status')
        .eq('coach_id', user.id),
    ])


    if (mealResult.error) {
      throw mealResult.error
    }


    if (workoutResult.error) {
      throw workoutResult.error
    }


    if (recipeResult.error) {
      throw recipeResult.error
    }


    const statuses = [
      ...(mealResult.data ?? []),
      ...(workoutResult.data ?? []),
      ...(recipeResult.data ?? []),
    ].map((row) => row.status)


    setContentCounts({
      pending: statuses.filter(
        (status) => status === 'pending_review'
      ).length,
      approved: statuses.filter(
        (status) => status === 'approved'
      ).length,
      changesRequested: statuses.filter(
        (status) => status === 'changes_requested'
      ).length,
    })
  } catch (error) {
    console.error('Unable to load content status counts:', error)
    setContentCounts(EMPTY_CONTENT_COUNTS)
  }
}, [])


  useFocusEffect(
    useCallback(() => {
      void loadContentCounts();
    }, [loadContentCounts])
  );


  useEffect(() => {
    loadCoachHome();
  }, []);


  const loadCoachHome = async () => {
    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();


      if (userError) {
        throw userError;
      }


      if (!user) {
        navigation.replace('Login');
        return;
      }


      const [profileResult, clientCountResult] = await Promise.all([
        supabase
          .from('profiles')
          .select('full_name, coaching_specialty')
          .eq('id', user.id)
          .single<CoachProfile>(),


        // Count premium users assigned to this coach through profiles.assigned_coach_id
        supabase
          .from('profiles')
          .select('id', { count: 'exact', head: true })
          .eq('assigned_coach_id', user.id),
      ]);


      if (profileResult.error) {
        throw profileResult.error;
      }


      if (clientCountResult.error) {
        throw clientCountResult.error;
      }


      const {
        data: latestReviewData,
        count: reviewCount,
        error: reviewsError,
      } = await supabase
        .from('coach_reviews')
        .select('rating, review_text', {
          count: 'exact',
        })
        .eq('coach_id', user.id)
        .order('updated_at', {
          ascending: false,
        })
        .limit(1);


      setRatingsError(Boolean(reviewsError));


      if (reviewsError) {
        console.error(
          'Unable to load coach rating summary:',
          reviewsError.message
        );
        setLatestRating(null);
      } else {
        setLatestRating(latestReviewData?.[0] ?? null);
      }


      setCoachName(profileResult.data?.full_name || 'Coach');
      setSpecialty(profileResult.data?.coaching_specialty || '');


      setStats({
        clients: clientCountResult.count ?? 0,
        pendingContent: contentCounts.pending,
        approvedContent: contentCounts.approved,
        changesRequestedContent: contentCounts.changesRequested,
        recentRatings: reviewsError ? 0 : reviewCount ?? 0,
      });


    } catch (error) {
      console.error('Unable to load coach dashboard:', error);
    } finally {
      setLoading(false);
    }
  };


  const firstName = coachName.trim().split(' ')[0] || 'Coach';


  if (loading) {
    return (
      <SafeAreaView style={styles.loadingScreen}>
        <ActivityIndicator size="large" color="#1E5C35" />
      </SafeAreaView>
    );
  }


  return (
    <View style={styles.screen}>
      <SafeAreaView
        edges={['top', 'left', 'right']}
        style={styles.safeArea}
      >
        <View style={styles.topBar}>
          <Text style={styles.topBarTitle}>Dashboard</Text>
        </View>


        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.content}
        >
          <View style={styles.headerRow}>
            <Text style={styles.pageHeading}>Dashboard</Text>


            <View style={styles.roleBadge}>
              <Text style={styles.roleBadgeText}>COACH</Text>
            </View>
          </View>


          <View style={styles.heroCard}>
            <View style={styles.heroTopRow}>
              <Text style={styles.heroGreeting}>Good afternoon</Text>


              <View style={styles.planChip}>
                <Text style={styles.planChipText}>
                  {specialty ? specialty.toUpperCase() : 'HEALTH COACH'}
                </Text>
              </View>
            </View>


            <Text style={styles.heroName}>Hello, {firstName} 👋</Text>


            <Text style={styles.heroSubtext}>
              Here&apos;s what&apos;s happening with your clients today.
            </Text>
          </View>


          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>Clients Assigned</Text>


            <View style={styles.summaryRow}>
              <Text style={styles.summaryNumber}>{stats.clients}</Text>


              <Pressable
                style={styles.viewUsersButton}
                onPress={() => navigation.navigate('CoachClients')}
              >
                <Text style={styles.viewUsersText}>View User List</Text>
              </Pressable>
            </View>


            <View style={styles.progressTrack}>
              <View
                style={[
                  styles.progressFill,
                  { width: stats.clients > 0 ? '45%' : '0%' },
                ]}
              />
            </View>
          </View>


          <Text style={styles.sectionTitle}>Your Coaching Tools</Text>


          <View style={styles.featureGrid}>
            <Pressable
              style={styles.featureCard}
              onPress={() => navigation.navigate('CoachContentStatus')}
            >
              <Text style={styles.featureEmoji}>📝</Text>
              <Text style={styles.featureTitle}>Content Status</Text>
              <Text style={styles.featureSubtitle}>
                {contentCounts.pending} pending ·{' '}
                {contentCounts.approved} approved
              </Text>
              {contentCounts.changesRequested > 0 ? (
                <Text style={styles.featureSubtitle}>
                  {contentCounts.changesRequested} changes requested
                </Text>
              ) : null}
            </Pressable>


            <Pressable
              style={styles.featureCard}
              onPress={() => navigation.navigate('CoachContent')}
            >
              <Text style={styles.featureEmoji}>📋</Text>
              <Text style={styles.featureTitle}>Content</Text>
              <Text style={styles.featureSubtitle}>
                Manage meal plans, workouts &amp; recipes
              </Text>
            </Pressable>


            <Pressable
              style={styles.featureCard}
              onPress={() => navigation.navigate('CoachChat')}
            >
              <Text style={styles.featureEmoji}>💬</Text>
              <Text style={styles.featureTitle}>Messages</Text>
              <Text style={styles.featureSubtitle}>
                {totalUnreadCount} unread
              </Text>
            </Pressable>


            <Pressable
              style={styles.featureCard}
              onPress={() => navigation.navigate('CoachRatings')}
            >
              <Text style={styles.featureEmoji}>⭐</Text>
              <Text style={styles.featureTitle}>Client Ratings</Text>


              <Text style={styles.featureSubtitle}>
                {ratingsError
                  ? 'Open to retry loading ratings'
                  : `${stats.recentRatings} ${
                      stats.recentRatings === 1 ? 'review' : 'reviews'
                    } received`}
              </Text>
            </Pressable>
          </View>


          <Text style={styles.sectionTitle}>Recent Activity</Text>


          <Pressable
            style={styles.activityCard}
            onPress={() => navigation.navigate('CoachChat')}
          >
            <Text style={styles.activityEmoji}>💬</Text>


            <View style={styles.activityTextBlock}>
              <Text style={styles.activityTitle}>
                {totalUnreadCount} Unread Messages
              </Text>


              <Text
                style={styles.activitySubtitle}
                numberOfLines={1}
              >
                {totalUnreadCount > 0
                  ? 'Open Messages to review unread client messages.'
                  : 'You are all caught up with client messages.'}
              </Text>
            </View>


            <Text style={styles.chevron}>›</Text>
          </Pressable>


          <Pressable
            style={styles.activityCard}
            onPress={() => navigation.navigate('CoachRatings')}
          >
            <Text style={styles.activityEmoji}>⭐</Text>


            <View style={styles.activityTextBlock}>
              <Text style={styles.activityTitle}>
                Latest Client Feedback
              </Text>


              <Text
                style={styles.activitySubtitle}
                numberOfLines={2}
              >
                {ratingsError
                  ? 'Unable to load feedback. Open Client Ratings to retry.'
                  : latestRating
                    ? `${latestRating.rating}/5 · ${
                        latestRating.review_text?.trim() ||
                        'Rating received without written feedback.'
                      }`
                    : 'No client ratings received yet.'}
              </Text>
            </View>


            <Text style={styles.chevron}>›</Text>
          </Pressable>
        </ScrollView>
      </SafeAreaView>


      <CoachBottomTabBar
        activeTab="CoachHome"
        onNavigate={(route) => navigation.navigate(route)}
      />
    </View>
  );
}



const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#F5FAF6',
  },
  safeArea: {
    flex: 1,
    backgroundColor: '#F5FAF6',
  },
  loadingScreen: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F5FAF6',
  },


  topBar: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
    backgroundColor: '#F5FAF6',
    borderBottomWidth: 1,
    borderBottomColor: '#E2ECE6',
  },
  topBarTitle: {
    color: '#1E5C35',
    fontSize: 17,
    fontWeight: '800',
  },


  content: {
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 24,
  },


  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  pageHeading: {
    color: '#16281D',
    fontSize: 26,
    fontWeight: '800',
  },
  roleBadge: {
    borderRadius: 999,
    backgroundColor: '#FBE8A6',
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  roleBadgeText: {
    color: '#7A5A00',
    fontSize: 12,
    fontWeight: '800',
  },


  heroCard: {
    marginBottom: 18,
    padding: 18,
    borderRadius: 20,
    backgroundColor: '#1E5C35',
  },
  heroTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  heroGreeting: {
    color: '#CFE4D6',
    fontSize: 12,
  },
  planChip: {
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.18)',
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  planChipText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
  },
  heroName: {
    marginTop: 4,
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '800',
  },
  heroSubtext: {
    marginTop: 8,
    color: '#D8EADF',
    fontSize: 13,
  },


  summaryCard: {
    marginBottom: 22,
    padding: 18,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
  },
  summaryLabel: {
    color: '#5C7267',
    fontSize: 14,
    fontWeight: '600',
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 6,
    marginBottom: 10,
  },
  summaryNumber: {
    color: '#16281D',
    fontSize: 30,
    fontWeight: '800',
  },
  viewUsersButton: {
    borderRadius: 999,
    backgroundColor: '#1E5C35',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  viewUsersText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  progressTrack: {
    height: 8,
    borderRadius: 999,
    backgroundColor: '#E2ECE6',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 999,
    backgroundColor: '#1E5C35',
  },


  sectionTitle: {
    marginBottom: 12,
    color: '#16281D',
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },


  featureGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 22,
  },
  featureCard: {
    width: '48%',
    marginBottom: 14,
    padding: 16,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
  },
  featureEmoji: {
    fontSize: 24,
    marginBottom: 10,
  },
  featureTitle: {
    color: '#16281D',
    fontSize: 15,
    fontWeight: '800',
  },
  featureSubtitle: {
    marginTop: 4,
    color: '#7C8F83',
    fontSize: 12,
  },


  activityCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    padding: 16,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
  },
  activityEmoji: {
    fontSize: 22,
    marginRight: 12,
  },
  activityTextBlock: {
    flex: 1,
  },
  activityTitle: {
    color: '#16281D',
    fontSize: 14,
    fontWeight: '700',
  },
  activitySubtitle: {
    marginTop: 3,
    color: '#7C8F83',
    fontSize: 12,
  },
  chevron: {
    marginLeft: 8,
    color: '#B7C6BC',
    fontSize: 22,
  },


  bottomTabBar: {
    height: 78,
    paddingTop: 8,
    paddingBottom: 18,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E2ECE6',
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabIcon: {
    fontSize: 19,
  },
  tabLabel: {
    marginTop: 3,
    fontSize: 11,
    fontWeight: '700',
  },
  bottomTabSafeArea: {
    backgroundColor: '#FFFFFF',
  },
});