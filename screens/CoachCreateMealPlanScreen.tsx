import React, { useCallback, useMemo, useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native'
import { useFocusEffect } from '@react-navigation/native'

import { supabase } from '../services/supabase'

type Props = {
  navigation: any
}

type AssignedClient = {
  id: string
  name: string
  goal: string
  calorieTarget: number | null
  dietaryPreferences: string[]
  allergies: string[]
}

type ProfileRow = {
  id: string
  full_name: string | null
  fitness_goal: string | null
  daily_calorie_target: number | null
  dietary_preferences: string[] | null
  allergies: string[] | null
}

const GOALS = [
  'Bodybuilding',
  'Power Lifting',
  'Hyrox',
  'Fat Loss',
  'Weight Gain',
  'Maintenance',
  'Weight Loss',
]

const DURATIONS = ['7 days', '14 days', '4 weeks', 'Custom']

export default function CoachCreateMealPlanScreen({ navigation }: Props) {
  const [selectedClient, setSelectedClient] = useState<AssignedClient | null>(
    null
  )
  const [clientSearch, setClientSearch] = useState('')
  const [assignedClients, setAssignedClients] = useState<AssignedClient[]>([])
  const [loadingClients, setLoadingClients] = useState(true)
  const [clientsError, setClientsError] = useState('')
  const [planTitle, setPlanTitle] = useState('')
  const [goal, setGoal] = useState('')
  const [duration, setDuration] = useState('')
  const [calorieTarget, setCalorieTarget] = useState('')
  const [coachNotes, setCoachNotes] = useState('')

  const filteredClients = useMemo(() => {
    const query = clientSearch.trim().toLowerCase()

    if (!query) {
      return assignedClients.slice(0, 5)
    }

    return assignedClients.filter((client) => {
      return client.name.toLowerCase().includes(query)
    })
  }, [assignedClients, clientSearch])

  const loadAssignedClients = useCallback(async () => {
    setLoadingClients(true)
    setClientsError('')

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser()

      if (userError) throw userError
      if (!user) throw new Error('Please log in again to load your clients.')

      const { data: assignments, error: assignmentsError } = await supabase
        .from('coach_assignments')
        .select('client_id, created_at')
        .eq('coach_id', user.id)
        .order('created_at', { ascending: false })

      if (assignmentsError) throw assignmentsError

      const clientIds = [
        ...new Set<string>(
          (assignments ?? []).map((assignment) => assignment.client_id)
        ),
      ]

      if (clientIds.length === 0) {
        setAssignedClients([])
        setSelectedClient(null)
        return
      }

      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select(
          'id, full_name, fitness_goal, daily_calorie_target, dietary_preferences, allergies'
        )
        .in('id', clientIds)

      if (profilesError) throw profilesError

      const profilesById = new Map(
        ((profiles ?? []) as ProfileRow[]).map((profile) => [
          profile.id,
          profile,
        ])
      )
      const clients: AssignedClient[] = []

      for (const id of clientIds) {
        const profile = profilesById.get(id)
        if (!profile) continue

        clients.push({
          id: profile.id,
          name: profile.full_name?.trim() || 'Unnamed client',
          goal: profile.fitness_goal || 'Maintenance',
          calorieTarget: profile.daily_calorie_target ?? null,
          dietaryPreferences: profile.dietary_preferences ?? [],
          allergies: profile.allergies ?? [],
        })
      }

      setAssignedClients(clients)
      setSelectedClient((current) => {
        return current
          ? clients.find((client) => client.id === current.id) ?? null
          : null
      })
    } catch (error: any) {
      console.error('Unable to load assigned clients:', error)
      setAssignedClients([])
      setSelectedClient(null)
      setClientsError(
        error?.message || 'Unable to load your assigned clients. Please try again.'
      )
    } finally {
      setLoadingClients(false)
    }
  }, [])

  useFocusEffect(
    useCallback(() => {
      void loadAssignedClients()
    }, [loadAssignedClients])
  )

  const selectClient = (client: AssignedClient) => {
    setSelectedClient(client)
    setClientSearch(client.name)

    // Preserve the original autofill behaviour: fill blank fields only.
    if (!goal) setGoal(client.goal || 'Maintenance')
    if (!calorieTarget && client.calorieTarget) {
      setCalorieTarget(String(client.calorieTarget))
    }
    if (!planTitle) setPlanTitle(`${client.name}'s Meal Plan`)
  }

  const validatePlanBasics = () => {
    if (loadingClients) return false

    if (!selectedClient) {
      Alert.alert('Select a client', 'Choose an assigned client first.')
      return false
    }
    if (!planTitle.trim()) {
      Alert.alert('Plan title required', 'Enter a name for this meal plan.')
      return false
    }
    if (!goal) {
      Alert.alert('Goal required', 'Select the primary goal for this meal plan.')
      return false
    }
    if (!duration) {
      Alert.alert('Duration required', 'Choose how long this plan will run.')
      return false
    }

    const calories = Number(calorieTarget)

    if (!calorieTarget.trim() || !Number.isFinite(calories) || calories <= 0) {
      Alert.alert(
        'Valid calorie target required',
        'Enter a daily calorie target greater than 0.'
      )
      return false
    }

    return true
  }

  const saveDraft = () => {
    if (!validatePlanBasics()) return

    Alert.alert(
      'Draft not saved yet',
      'Finish building the meal plan first. The Review screen will save the complete plan to Supabase as a draft.'
    )
  }

  const continueToMealBuilder = () => {
    if (!validatePlanBasics() || !selectedClient) return

    navigation.navigate('CoachMealPlanBuilder', {
      planBasics: {
        clientId: selectedClient.id,
        clientName: selectedClient.name,
        clientGoal: selectedClient.goal,
        clientDietaryPreference:
          selectedClient.dietaryPreferences.length > 0
            ? selectedClient.dietaryPreferences.join(', ')
            : 'No preference',
        clientAllergies:
          selectedClient.allergies.length > 0
            ? selectedClient.allergies.join(', ')
            : 'None recorded',
        planTitle: planTitle.trim(),
        goal,
        duration,
        calorieTarget: Number(calorieTarget),
        coachNotes: coachNotes.trim(),
      },
    })
  }

  return (
    <View style={styles.screen}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.content}
        >
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
            accessibilityRole="button"
            accessibilityLabel="Go back to meal plans"
          >
            <Text style={styles.backButtonText}>‹ Meal Plans</Text>
          </TouchableOpacity>

          <Text style={styles.pageHeading}>Create Meal Plan</Text>
          <Text style={styles.pageSubtitle}>
            Start with the client and plan details. Build the meals next, then
            save or submit the complete plan from the Review screen.
          </Text>

          <View style={styles.progressCard}>
            <View style={styles.progressHeader}>
              <Text style={styles.progressTitle}>Step 1 of 3</Text>
              <Text style={styles.progressText}>Plan basics</Text>
            </View>
            <View style={styles.progressTrack}>
              <View style={styles.progressFill} />
            </View>
            <View style={styles.progressLabels}>
              <Text style={styles.progressLabelActive}>1. Basics</Text>
              <Text style={styles.progressLabel}>2. Meals</Text>
              <Text style={styles.progressLabel}>3. Review</Text>
            </View>
          </View>

          <Text style={styles.sectionTitle}>Client</Text>
          <Text style={styles.sectionDescription}>
            Choose an assigned client below, or search by name to find another
            client.
          </Text>

          <View style={styles.clientSearchWrap}>
            <Text style={styles.clientSearchIcon}>⌕</Text>
            <TextInput
              value={clientSearch}
              onChangeText={(text) => {
                setClientSearch(text)
                setSelectedClient(null)
              }}
              style={styles.clientSearchInput}
              placeholder="Search your assigned clients"
              placeholderTextColor="#8B9D92"
              autoCapitalize="words"
              autoCorrect={false}
              returnKeyType="search"
              editable={!loadingClients}
              accessibilityLabel="Search assigned clients"
            />
            {clientSearch ? (
              <Pressable
                style={styles.clearSearchButton}
                onPress={() => {
                  setClientSearch('')
                  setSelectedClient(null)
                }}
                accessibilityRole="button"
                accessibilityLabel="Clear client search"
              >
                <Text style={styles.clearSearchText}>×</Text>
              </Pressable>
            ) : null}
          </View>

          {loadingClients ? (
            <View style={styles.clientSearchHint}>
              <ActivityIndicator color="#1E5C35" />
              <Text style={styles.clientSearchHintText}>
                Loading your assigned clients...
              </Text>
            </View>
          ) : clientsError ? (
            <View style={styles.clientSearchHint}>
              <Text style={styles.clientSearchHintText}>{clientsError}</Text>
              <Pressable
                onPress={() => void loadAssignedClients()}
                accessibilityRole="button"
                accessibilityLabel="Retry loading assigned clients"
              >
                <Text style={styles.changeClientText}>Try again</Text>
              </Pressable>
            </View>
          ) : selectedClient ? (
            <View style={styles.selectedClientCard}>
              <View style={styles.selectedClientHeader}>
                <Text style={styles.selectedClientLabel}>Selected client</Text>
                <Pressable
                  onPress={() => {
                    setSelectedClient(null)
                    setClientSearch('')
                  }}
                  accessibilityRole="button"
                  accessibilityLabel="Change selected client"
                >
                  <Text style={styles.changeClientText}>Change</Text>
                </Pressable>
              </View>
              <View style={styles.selectedClientContent}>
                <View style={styles.clientAvatar}>
                  <Text style={styles.clientAvatarText}>
                    {getInitials(selectedClient.name)}
                  </Text>
                </View>
                <View style={styles.clientTextWrap}>
                  <Text style={styles.clientName}>{selectedClient.name}</Text>
                  <Text style={styles.clientMeta}>
                    {selectedClient.goal} · {formatTarget(selectedClient)}
                  </Text>
                </View>
                <Text style={styles.selectedClientCheck}>✓</Text>
              </View>
            </View>
          ) : assignedClients.length === 0 ? (
            <View style={styles.clientSearchHint}>
              <Text style={styles.clientSearchHintText}>
                No assigned client profiles are available. Check your
                assignments and profile access before creating a meal plan.
              </Text>
            </View>
          ) : (
            <View style={styles.searchResultsWrap}>
              <Text style={styles.searchResultsLabel}>
                {clientSearch.trim()
                  ? `${filteredClients.length} matching ${
                      filteredClients.length === 1 ? 'client' : 'clients'
                    }`
                  : `Showing ${filteredClients.length} of ${assignedClients.length} assigned clients`}
              </Text>
              {filteredClients.length === 0 ? (
                <View style={styles.clientSearchHint}>
                  <Text style={styles.clientSearchHintText}>
                    No matching clients. Try a different name.
                  </Text>
                </View>
              ) : (
                filteredClients.map((client) => (
                  <Pressable
                    key={client.id}
                    style={styles.clientSearchResultCard}
                    onPress={() => selectClient(client)}
                    accessibilityRole="button"
                    accessibilityLabel={`Select ${client.name}`}
                  >
                    <View style={styles.clientAvatar}>
                      <Text style={styles.clientAvatarText}>
                        {getInitials(client.name)}
                      </Text>
                    </View>
                    <View style={styles.clientTextWrap}>
                      <Text style={styles.clientName}>{client.name}</Text>
                      <Text style={styles.clientMeta}>
                        {client.goal} · {formatTarget(client)}
                      </Text>
                    </View>
                    <Text style={styles.searchResultChevron}>›</Text>
                  </Pressable>
                ))
              )}
              {!clientSearch.trim() && assignedClients.length > 5 ? (
                <Text style={styles.clientSearchHintText}>
                  Search above to find your other assigned clients.
                </Text>
              ) : null}
            </View>
          )}

          {selectedClient ? (
            <View style={styles.clientContextCard}>
              <Text style={styles.clientContextTitle}>Client context</Text>
              <View style={styles.clientContextRow}>
                <Text style={styles.clientContextLabel}>Goal</Text>
                <Text style={styles.clientContextValue}>
                  {selectedClient.goal}
                </Text>
              </View>
              <View style={styles.clientContextRow}>
                <Text style={styles.clientContextLabel}>Diet</Text>
                <Text style={styles.clientContextValue}>
                  {selectedClient.dietaryPreferences.length > 0
                    ? selectedClient.dietaryPreferences.join(', ')
                    : 'No preference'}
                </Text>
              </View>
              <View style={styles.clientContextRow}>
                <Text style={styles.clientContextLabel}>Allergies</Text>
                <Text
                  style={[
                    styles.clientContextValue,
                    selectedClient.allergies.length > 0 && styles.allergyWarning,
                  ]}
                >
                  {selectedClient.allergies.length > 0
                    ? selectedClient.allergies.join(', ')
                    : 'None recorded'}
                </Text>
              </View>
            </View>
          ) : null}

          <Text style={styles.sectionTitle}>Plan details</Text>
          <Text style={styles.inputLabel}>Plan name</Text>
          <TextInput
            value={planTitle}
            onChangeText={setPlanTitle}
            placeholder="Example: 4-Week Balanced Meal Plan"
            placeholderTextColor="#94A49A"
            style={styles.textInput}
            accessibilityLabel="Meal plan name"
          />

          <Text style={styles.inputLabel}>Primary goal</Text>
          <ChoiceGroup
            options={GOALS}
            value={goal}
            onSelect={setGoal}
          />
          <Text style={styles.inputLabel}>Plan duration</Text>
          <ChoiceGroup
            options={DURATIONS}
            value={duration}
            onSelect={setDuration}
          />
          <Text style={styles.inputLabel}>Daily calorie target</Text>
          <View style={styles.calorieInputWrap}>
            <TextInput
              value={calorieTarget}
              onChangeText={setCalorieTarget}
              placeholder="1800"
              placeholderTextColor="#94A49A"
              keyboardType="numeric"
              style={styles.calorieInput}
              accessibilityLabel="Daily calorie target"
            />
            <Text style={styles.calorieSuffix}>kcal/day</Text>
          </View>
          <Text style={styles.inputLabel}>Coach notes for the client</Text>
          <TextInput
            value={coachNotes}
            onChangeText={setCoachNotes}
            placeholder="Example: Focus on regular meals and aim to prepare lunch the night before."
            placeholderTextColor="#94A49A"
            multiline
            textAlignVertical="top"
            style={[styles.textInput, styles.notesInput]}
            accessibilityLabel="Coach notes for client"
          />

          <View style={styles.draftNotice}>
            <Text style={styles.draftNoticeIcon}>i</Text>
            <Text style={styles.draftNoticeText}>
              Finish building the meals and continue to Review to save the
              complete draft. This step does not save a database row.
            </Text>
          </View>
          <View style={styles.bottomActions}>
            <Pressable
              style={styles.saveDraftButton}
              onPress={saveDraft}
              disabled={loadingClients}
              accessibilityRole="button"
              accessibilityLabel="Save meal plan draft"
            >
              <Text style={styles.saveDraftButtonText}>Save Draft</Text>
            </Pressable>
            <Pressable
              style={styles.continueButton}
              onPress={continueToMealBuilder}
              disabled={loadingClients}
              accessibilityRole="button"
              accessibilityLabel="Continue to add meals"
            >
              <Text style={styles.continueButtonText}>Add Meals ›</Text>
            </Pressable>
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  )
}

function formatTarget(client: AssignedClient) {
  return client.calorieTarget
    ? `${client.calorieTarget.toLocaleString()} kcal/day`
    : 'No calorie target'
}

function getInitials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()
}

function ChoiceGroup({
  options,
  value,
  onSelect,
}: {
  options: string[]
  value: string
  onSelect: (value: string) => void
}) {
  return (
    <View style={styles.choiceWrap}>
      {options.map((item) => {
        const isSelected = value === item

        return (
          <Pressable
            key={item}
            style={[
              styles.choiceButton,
              isSelected && styles.choiceButtonActive,
            ]}
            onPress={() => onSelect(item)}
            accessibilityRole="button"
            accessibilityLabel={`Select ${item}`}
            accessibilityState={{ selected: isSelected }}
          >
            <Text
              style={[
                styles.choiceButtonText,
                isSelected && styles.choiceButtonTextActive,
              ]}
            >
              {item}
            </Text>
          </Pressable>
        )
      })}
    </View>
  )
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

  content: {
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 36,
  },

  backButton: {
    alignSelf: 'flex-start',
    paddingVertical: 8,
    paddingRight: 14,
  },

  backButtonText: {
    color: '#1E5C35',
    fontSize: 15,
    fontWeight: '800',
  },

  pageHeading: {
    marginTop: 6,
    color: '#16281D',
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: -0.5,
  },

  pageSubtitle: {
    marginTop: 6,
    color: '#5C7267',
    fontSize: 14,
    lineHeight: 21,
  },

  progressCard: {
    marginTop: 20,
    padding: 15,
    borderRadius: 17,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2ECE6',
  },

  progressHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  progressTitle: {
    color: '#1E5C35',
    fontSize: 13,
    fontWeight: '800',
  },

  progressText: {
    color: '#7C8F83',
    fontSize: 12,
    fontWeight: '700',
  },

  progressTrack: {
    height: 7,
    marginTop: 12,
    overflow: 'hidden',
    borderRadius: 5,
    backgroundColor: '#E8F0EA',
  },

  progressFill: {
    width: '33.33%',
    height: '100%',
    borderRadius: 5,
    backgroundColor: '#1E5C35',
  },

  progressLabels: {
    marginTop: 9,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },

  progressLabel: {
    color: '#8B9D92',
    fontSize: 10,
    fontWeight: '700',
  },

  progressLabelActive: {
    color: '#1E5C35',
    fontSize: 10,
    fontWeight: '800',
  },

  sectionTitle: {
    marginTop: 26,
    marginBottom: 10,
    color: '#16281D',
    fontSize: 18,
    fontWeight: '800',
  },

  sectionDescription: {
    marginBottom: 12,
    color: '#5C7267',
    fontSize: 13,
    lineHeight: 19,
  },

  clientSearchWrap: {
    height: 50,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 13,
    borderRadius: 13,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D6E4DB',
  },

  clientSearchIcon: {
    marginRight: 8,
    color: '#5C7267',
    fontSize: 24,
    fontWeight: '400',
    lineHeight: 26,
  },

  clientSearchInput: {
    flex: 1,
    color: '#16281D',
    fontSize: 14,
  },

  clearSearchButton: {
    width: 30,
    height: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },

  clearSearchText: {
    color: '#5C7267',
    fontSize: 24,
    fontWeight: '300',
    lineHeight: 27,
  },

  searchResultsWrap: {
    marginTop: 10,
  },

  searchResultsLabel: {
    marginBottom: 8,
    color: '#71857A',
    fontSize: 11,
    fontWeight: '700',
  },

  clientSearchResultCard: {
    minHeight: 70,
    marginBottom: 9,
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E0EBE4',
  },

  searchResultChevron: {
    marginLeft: 8,
    color: '#1E5C35',
    fontSize: 25,
    fontWeight: '300',
  },

  selectedClientCard: {
    marginTop: 11,
    padding: 14,
    borderRadius: 16,
    backgroundColor: '#F0F8F2',
    borderWidth: 1,
    borderColor: '#9CC8A9',
  },

  selectedClientHeader: {
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  selectedClientLabel: {
    color: '#1E5C35',
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },

  changeClientText: {
    color: '#1E5C35',
    fontSize: 12,
    fontWeight: '800',
    textDecorationLine: 'underline',
  },

  selectedClientContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  selectedClientCheck: {
    width: 25,
    height: 25,
    marginLeft: 8,
    overflow: 'hidden',
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '900',
    lineHeight: 25,
    textAlign: 'center',
    borderRadius: 13,
    backgroundColor: '#1E5C35',
  },

  clientAvatar: {
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 21,
    backgroundColor: '#D8EADF',
  },

  clientAvatarText: {
    color: '#1E5C35',
    fontSize: 14,
    fontWeight: '800',
  },

  clientTextWrap: {
    flex: 1,
    marginLeft: 11,
    paddingRight: 8,
  },

  clientName: {
    color: '#16281D',
    fontSize: 14,
    fontWeight: '800',
  },

  clientMeta: {
    marginTop: 3,
    color: '#5C7267',
    fontSize: 11,
    lineHeight: 16,
  },

  clientSearchHint: {
    marginTop: 10,
    paddingVertical: 12,
    paddingHorizontal: 13,
    borderRadius: 13,
    backgroundColor: '#EDF5EF',
  },

  clientSearchHintText: {
    color: '#5C7267',
    fontSize: 12,
    lineHeight: 17,
  },

  clientContextCard: {
    marginTop: 10,
    padding: 14,
    borderRadius: 15,
    backgroundColor: '#EAF4ED',
    borderWidth: 1,
    borderColor: '#D4E7D9',
  },

  clientContextTitle: {
    marginBottom: 10,
    color: '#1E5C35',
    fontSize: 13,
    fontWeight: '800',
  },

  clientContextRow: {
    marginBottom: 7,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },

  clientContextLabel: {
    color: '#5C7267',
    fontSize: 12,
    fontWeight: '600',
  },

  clientContextValue: {
    maxWidth: '58%',
    color: '#274334',
    fontSize: 12,
    fontWeight: '800',
    textAlign: 'right',
  },

  allergyWarning: {
    color: '#A13D27',
  },

  inputLabel: {
    marginTop: 17,
    marginBottom: 7,
    color: '#355244',
    fontSize: 13,
    fontWeight: '800',
  },

  textInput: {
    minHeight: 50,
    paddingHorizontal: 14,
    color: '#16281D',
    fontSize: 14,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#DDE9E1',
  },

  notesInput: {
    height: 105,
    paddingTop: 13,
  },

  choiceWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },

  choiceButton: {
    marginRight: 8,
    marginBottom: 8,
    paddingHorizontal: 13,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#DDE9E1',
  },

  choiceButtonActive: {
    backgroundColor: '#1E5C35',
    borderColor: '#1E5C35',
  },

  choiceButtonText: {
    color: '#5C7267',
    fontSize: 12,
    fontWeight: '800',
  },

  choiceButtonTextActive: {
    color: '#FFFFFF',
  },

  calorieInputWrap: {
    height: 50,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#DDE9E1',
  },

  calorieInput: {
    flex: 1,
    paddingVertical: 0,
    color: '#16281D',
    fontSize: 14,
  },

  calorieSuffix: {
    color: '#5C7267',
    fontSize: 13,
    fontWeight: '700',
  },

  draftNotice: {
    marginTop: 18,
    padding: 13,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    backgroundColor: '#F0F7F2',
    borderWidth: 1,
    borderColor: '#D9EBDD',
  },

  draftNoticeIcon: {
    width: 20,
    height: 20,
    overflow: 'hidden',
    color: '#1E5C35',
    fontSize: 12,
    fontWeight: '900',
    lineHeight: 20,
    textAlign: 'center',
    borderRadius: 10,
    backgroundColor: '#CFE7D5',
  },

  draftNoticeText: {
    flex: 1,
    marginLeft: 8,
    color: '#496656',
    fontSize: 11,
    fontWeight: '700',
    lineHeight: 16,
  },

  bottomActions: {
    marginTop: 22,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },

  saveDraftButton: {
    width: '35%',
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#1E5C35',
  },

  saveDraftButtonText: {
    color: '#1E5C35',
    fontSize: 14,
    fontWeight: '800',
  },

  continueButton: {
    width: '61%',
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
    backgroundColor: '#1E5C35',
    shadowColor: '#163020',
    shadowOffset: {
      width: 0,
      height: 3,
    },
    shadowOpacity: 0.16,
    shadowRadius: 5,
    elevation: 3,
  },

  continueButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },

})
