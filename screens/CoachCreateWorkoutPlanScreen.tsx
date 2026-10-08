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

type Client = {
  id: string
  name: string
  goal: string
  activityLevel: string
}

type AssignmentRow = {
  client_id: string
  created_at: string
}

type ClientProfileRow = {
  id: string
  full_name: string | null
  fitness_goal: string | null
  activity_level: string | null
}

const GOALS = [
  'General fitness',
  'Build strength',
  'Build muscle',
  'Fat loss',
  'Improve endurance',
  'Mobility and movement',
  'Sport performance',
]

const EXPERIENCE_LEVELS = [
  'Beginner',
  'Intermediate',
  'Advanced',
  'Returning after a break',
]

const TRAINING_LOCATIONS = [
  'Home',
  'Gym',
  'Home and gym',
  'Outdoor',
  'Other',
]

const EQUIPMENT_OPTIONS = [
  'Bodyweight only',
  'Resistance bands',
  'Dumbbells',
  'Barbell',
  'Machines',
  'Kettlebells',
  'Cardio equipment',
  'Other',
]

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

export default function CoachCreateWorkoutPlanScreen({
  navigation,
}: Props) {
  const [selectedClientId, setSelectedClientId] = useState('')
  const [clientSearch, setClientSearch] = useState('')
  const [clients, setClients] = useState<Client[]>([])
  const [loadingClients, setLoadingClients] = useState(true)
  const [clientLoadError, setClientLoadError] = useState('')
  const [title, setTitle] = useState('')
  const [goal, setGoal] = useState('')
  const [durationWeeks, setDurationWeeks] = useState('4')
  const [sessionsPerWeek, setSessionsPerWeek] = useState('3')
  const [sessionLengthMinutes, setSessionLengthMinutes] = useState('45')
  const [trainingLocation, setTrainingLocation] = useState('')
  const [experienceLevel, setExperienceLevel] = useState('')
  const [equipment, setEquipment] = useState<string[]>([])
  const [preferredDays, setPreferredDays] = useState<string[]>([])
  const [healthNotes, setHealthNotes] = useState('')
  const [coachNotes, setCoachNotes] = useState('')
  const [saving, setSaving] = useState(false)

  const selectedClient = useMemo(() => {
    return clients.find((client) => client.id === selectedClientId) ?? null
  }, [clients, selectedClientId])

  const filteredClients = useMemo(() => {
    const query = clientSearch.trim().toLowerCase()

    if (!query) {
      return clients.slice(0, 5)
    }

    return clients.filter((client) => {
      return client.name.toLowerCase().includes(query)
    })
  }, [clients, clientSearch])

  const loadAssignedClients = useCallback(async () => {
    setLoadingClients(true)
    setClientLoadError('')

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser()

      if (userError) throw userError

      if (!user) {
        throw new Error('Please log in again to load your assigned clients.')
      }

      const { data: assignmentData, error: assignmentError } = await supabase
        .from('coach_assignments')
        .select('client_id, created_at')
        .eq('coach_id', user.id)
        .order('created_at', { ascending: false })

      if (assignmentError) throw assignmentError

      const assignments = (assignmentData ?? []) as AssignmentRow[]
      const clientIds = [
        ...new Set(assignments.map((assignment) => assignment.client_id)),
      ]

      if (clientIds.length === 0) {
        setClients([])
        setSelectedClientId('')
        return
      }

      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('id, full_name, fitness_goal, activity_level')
        .in('id', clientIds)

      if (profileError) throw profileError

      const profilesById = new Map(
        ((profileData ?? []) as ClientProfileRow[]).map((profile) => [
          profile.id,
          profile,
        ])
      )

      const assignedClients: Client[] = []

      for (const clientId of clientIds) {
        const profile = profilesById.get(clientId)

        if (!profile) continue

        assignedClients.push({
          id: profile.id,
          name: profile.full_name?.trim() || 'Premium member',
          goal: profile.fitness_goal || 'Goal not set',
          activityLevel: profile.activity_level || 'Activity level not set',
        })
      }

      setClients(assignedClients)
      setSelectedClientId((currentId) => {
        return assignedClients.some((client) => client.id === currentId)
          ? currentId
          : ''
      })
    } catch (error: any) {
      console.error('Unable to load assigned workout clients:', error)
      setClients([])
      setSelectedClientId('')
      setClientLoadError(
        error?.message || 'Unable to load assigned clients. Please try again.'
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

  const toggleEquipment = (item: string) => {
    setEquipment((current) =>
      current.includes(item)
        ? current.filter((value) => value !== item)
        : [...current, item]
    )
  }

  const togglePreferredDay = (day: string) => {
    setPreferredDays((current) =>
      current.includes(day)
        ? current.filter((value) => value !== day)
        : [...current, day]
    )
  }

  const handleContinue = async () => {
    if (saving || loadingClients) return

    const parsedDuration = Number(durationWeeks)
    const parsedSessions = Number(sessionsPerWeek)
    const parsedSessionLength = Number(sessionLengthMinutes)

    if (!selectedClient) {
      Alert.alert(
        'Client required',
        'Select the client this workout plan is being created for.'
      )
      return
    }

    if (!title.trim()) {
      Alert.alert(
        'Plan title required',
        'Give this workout plan a clear title before continuing.'
      )
      return
    }

    if (!goal) {
      Alert.alert(
        'Training goal required',
        'Choose the primary goal for this workout plan.'
      )
      return
    }

    if (
      !Number.isInteger(parsedDuration) ||
      parsedDuration < 1 ||
      parsedDuration > 52
    ) {
      Alert.alert(
        'Check plan duration',
        'Enter a whole number between 1 and 52 weeks.'
      )
      return
    }

    if (
      !Number.isInteger(parsedSessions) ||
      parsedSessions < 1 ||
      parsedSessions > 7
    ) {
      Alert.alert(
        'Check weekly sessions',
        'Enter a whole number between 1 and 7 sessions per week.'
      )
      return
    }

    if (
      !Number.isInteger(parsedSessionLength) ||
      parsedSessionLength < 10 ||
      parsedSessionLength > 240
    ) {
      Alert.alert(
        'Check session length',
        'Enter a session length between 10 and 240 minutes.'
      )
      return
    }

    if (!trainingLocation) {
      Alert.alert(
        'Training location required',
        'Choose where the client is expected to train.'
      )
      return
    }

    if (!experienceLevel) {
      Alert.alert(
        'Experience level required',
        'Choose the client’s current training experience level.'
      )
      return
    }

    if (equipment.length === 0) {
      Alert.alert(
        'Equipment required',
        'Select the equipment the client can realistically access.'
      )
      return
    }

    if (preferredDays.length !== parsedSessions) {
      Alert.alert(
        'Choose workout days',
        `Select exactly ${parsedSessions} preferred workout ${
          parsedSessions === 1 ? 'day' : 'days'
        } to match the number of sessions per week.`
      )
      return
    }

    try {
      setSaving(true)

      const draft = {
        clientId: selectedClient.id,
        clientName: selectedClient.name,
        title: title.trim(),
        goal,
        durationWeeks: parsedDuration,
        sessionsPerWeek: parsedSessions,
        sessionLengthMinutes: parsedSessionLength,
        trainingLocation,
        experienceLevel,
        equipment,
        preferredDays,
        healthNotes: healthNotes.trim(),
        coachNotes: coachNotes.trim(),
        status: 'draft' as const,
      }

      // This passes the draft in memory; it does not save a database row.
      navigation.navigate('CoachWorkoutPlanBuilder', {
        workoutPlanDraft: draft,
      })
    } catch (error) {
      console.error('Unable to start workout plan:', error)
      Alert.alert(
        'Could not continue',
        'We could not start this workout plan. Please try again.'
      )
    } finally {
      setSaving(false)
    }
  }

  return (
    <View style={styles.screen}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.topBar}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
            accessibilityRole="button"
            accessibilityLabel="Go back to workout plans"
          >
            <Text style={styles.backButtonText}>‹ Workout Plans</Text>
          </TouchableOpacity>

          <Text style={styles.topBarTitle}>New workout plan</Text>
          <View style={styles.topBarSpacer} />
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.content}
        >
          <View style={styles.progressRow}>
            <View style={styles.progressItem}>
              <View style={[styles.progressDot, styles.progressDotActive]}>
                <Text style={styles.progressDotTextActive}>1</Text>
              </View>
              <Text style={styles.progressLabelActive}>Plan basics</Text>
            </View>

            <View style={styles.progressLine} />

            <View style={styles.progressItem}>
              <View style={styles.progressDot}>
                <Text style={styles.progressDotText}>2</Text>
              </View>
              <Text style={styles.progressLabel}>Build workouts</Text>
            </View>

            <View style={styles.progressLine} />

            <View style={styles.progressItem}>
              <View style={styles.progressDot}>
                <Text style={styles.progressDotText}>3</Text>
              </View>
              <Text style={styles.progressLabel}>Review</Text>
            </View>
          </View>

          <Text style={styles.pageHeading}>Set up the plan</Text>
          <Text style={styles.pageSubtitle}>
            Start with the client’s goal, schedule, available equipment, and
            relevant safety information. You will add workout days and exercises
            in the next step.
          </Text>

          <View style={styles.safetyCard}>
            <Text style={styles.safetyIcon}>!</Text>
            <View style={styles.safetyTextWrap}>
              <Text style={styles.safetyTitle}>Coach safety check</Text>
              <Text style={styles.safetyText}>
                Use information already approved for coaching. Do not diagnose,
                treat injuries, or prescribe rehabilitation. Escalate new,
                severe, or concerning symptoms to an appropriate healthcare
                professional.
              </Text>
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
                setSelectedClientId('')
              }}
              style={styles.clientSearchInput}
              placeholder="Search your assigned clients"
              placeholderTextColor="#8B9D92"
              autoCapitalize="words"
              autoCorrect={false}
              returnKeyType="search"
              editable={!loadingClients && !saving}
              accessibilityLabel="Search assigned clients"
            />

            {clientSearch ? (
              <Pressable
                style={styles.clearSearchButton}
                disabled={saving}
                onPress={() => {
                  setClientSearch('')
                  setSelectedClientId('')
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
          ) : clientLoadError ? (
            <View style={styles.clientSearchHint}>
              <Text style={styles.clientSearchHintText}>
                {clientLoadError}
              </Text>
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
                  disabled={saving}
                  onPress={() => {
                    setSelectedClientId('')
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
                    {selectedClient.goal} · {selectedClient.activityLevel}
                  </Text>
                </View>
                <Text style={styles.selectedClientCheck}>✓</Text>
              </View>
            </View>
          ) : clients.length === 0 ? (
            <View style={styles.clientSearchHint}>
              <Text style={styles.clientSearchHintText}>
                No assigned client profiles are available. Check your
                assignments and profile access before creating a workout plan.
              </Text>
            </View>
          ) : (
            <View style={styles.searchResultsWrap}>
              <Text style={styles.searchResultsLabel}>
                {clientSearch.trim()
                  ? `${filteredClients.length} matching ${
                      filteredClients.length === 1 ? 'client' : 'clients'
                    }`
                  : `Showing ${filteredClients.length} of ${clients.length} assigned clients`}
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
                    disabled={saving}
                    onPress={() => {
                      setSelectedClientId(client.id)
                      setClientSearch(client.name)
                    }}
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
                        {client.goal} · {client.activityLevel}
                      </Text>
                    </View>
                    <Text style={styles.searchResultChevron}>›</Text>
                  </Pressable>
                ))
              )}

              {!clientSearch.trim() && clients.length > 5 ? (
                <Text style={styles.clientSearchHintText}>
                  Search above to find your other assigned clients.
                </Text>
              ) : null}
            </View>
          )}

          <Text style={styles.sectionTitle}>Plan details</Text>
          <FieldLabel label="Plan title" required />
          <TextInput
            value={title}
            onChangeText={setTitle}
            style={styles.textInput}
            placeholder="Example: 4-Week Strength Foundations"
            placeholderTextColor="#8B9D92"
            maxLength={80}
            accessibilityLabel="Workout plan title"
          />

          <FieldLabel label="Primary goal" required />
          <ChoiceGrid
            options={GOALS}
            selectedValue={goal}
            onSelect={setGoal}
          />

          <FieldLabel label="Plan duration" required />
          <View style={styles.numberFieldRow}>
            <TextInput
              value={durationWeeks}
              onChangeText={setDurationWeeks}
              style={[styles.textInput, styles.numberInput]}
              placeholder="4"
              placeholderTextColor="#8B9D92"
              keyboardType="number-pad"
              maxLength={2}
              accessibilityLabel="Plan duration in weeks"
            />
            <Text style={styles.numberFieldUnit}>weeks</Text>
          </View>

          <Text style={styles.sectionTitle}>Schedule</Text>
          <FieldLabel label="Sessions per week" required />
          <View style={styles.numberFieldRow}>
            <TextInput
              value={sessionsPerWeek}
              onChangeText={setSessionsPerWeek}
              style={[styles.textInput, styles.numberInput]}
              placeholder="3"
              placeholderTextColor="#8B9D92"
              keyboardType="number-pad"
              maxLength={1}
              accessibilityLabel="Number of sessions per week"
            />
            <Text style={styles.numberFieldUnit}>sessions</Text>
          </View>

          <FieldLabel label="Typical session length" required />
          <View style={styles.numberFieldRow}>
            <TextInput
              value={sessionLengthMinutes}
              onChangeText={setSessionLengthMinutes}
              style={[styles.textInput, styles.numberInput]}
              placeholder="45"
              placeholderTextColor="#8B9D92"
              keyboardType="number-pad"
              maxLength={3}
              accessibilityLabel="Session length in minutes"
            />
            <Text style={styles.numberFieldUnit}>minutes</Text>
          </View>

          <FieldLabel label="Preferred workout days" required />
          <Text style={styles.fieldHint}>
            Select the same number of days as sessions per week.
          </Text>
          <View style={styles.dayRow}>
            {DAYS.map((day) => {
              const isSelected = preferredDays.includes(day)

              return (
                <Pressable
                  key={day}
                  style={[
                    styles.dayButton,
                    isSelected && styles.dayButtonActive,
                  ]}
                  onPress={() => togglePreferredDay(day)}
                  accessibilityRole="checkbox"
                  accessibilityLabel={`Workout day ${day}`}
                  accessibilityState={{ checked: isSelected }}
                >
                  <Text
                    style={[
                      styles.dayButtonText,
                      isSelected && styles.dayButtonTextActive,
                    ]}
                  >
                    {day}
                  </Text>
                </Pressable>
              )
            })}
          </View>

          <Text style={styles.sectionTitle}>Training context</Text>
          <FieldLabel label="Training location" required />
          <ChoiceGrid
            options={TRAINING_LOCATIONS}
            selectedValue={trainingLocation}
            onSelect={setTrainingLocation}
          />
          <FieldLabel label="Current experience level" required />
          <ChoiceGrid
            options={EXPERIENCE_LEVELS}
            selectedValue={experienceLevel}
            onSelect={setExperienceLevel}
          />
          <FieldLabel label="Available equipment" required />
          <Text style={styles.fieldHint}>
            Select everything the client can access reliably.
          </Text>
          <View style={styles.multiChoiceWrap}>
            {EQUIPMENT_OPTIONS.map((item) => {
              const isSelected = equipment.includes(item)

              return (
                <Pressable
                  key={item}
                  style={[
                    styles.multiChoiceButton,
                    isSelected && styles.multiChoiceButtonActive,
                  ]}
                  onPress={() => toggleEquipment(item)}
                  accessibilityRole="checkbox"
                  accessibilityLabel={item}
                  accessibilityState={{ checked: isSelected }}
                >
                  <Text
                    style={[
                      styles.multiChoiceText,
                      isSelected && styles.multiChoiceTextActive,
                    ]}
                  >
                    {isSelected ? '✓ ' : ''}
                    {item}
                  </Text>
                </Pressable>
              )
            })}
          </View>

          <Text style={styles.sectionTitle}>Important notes</Text>
          <Text style={styles.sectionDescription}>
            Record only coaching-relevant context. The plan builder will display
            this information as a reminder while you select exercises.
          </Text>
          <FieldLabel label="Health, injury, or movement considerations" />
          <TextInput
            value={healthNotes}
            onChangeText={setHealthNotes}
            style={[styles.textInput, styles.multilineInput]}
            placeholder="Example: Reports occasional knee discomfort during deep knee bends. Avoid painful movement and use approved modifications."
            placeholderTextColor="#8B9D92"
            multiline
            textAlignVertical="top"
            maxLength={500}
            accessibilityLabel="Health injury or movement considerations"
          />
          <FieldLabel label="Coach notes" />
          <TextInput
            value={coachNotes}
            onChangeText={setCoachNotes}
            style={[styles.textInput, styles.multilineInput]}
            placeholder="Add preferences, motivation notes, or other planning context."
            placeholderTextColor="#8B9D92"
            multiline
            textAlignVertical="top"
            maxLength={500}
            accessibilityLabel="Coach notes"
          />

          <View style={styles.bottomNotice}>
            <Text style={styles.bottomNoticeText}>
              Continue to build this draft. It is not saved to the database yet.
              Saving and submission will be connected in the review step.
            </Text>
          </View>
          <TouchableOpacity
            style={[
              styles.continueButton,
              (saving || loadingClients) && styles.continueButtonDisabled,
            ]}
            disabled={saving || loadingClients}
            onPress={handleContinue}
            accessibilityRole="button"
            accessibilityLabel="Continue to build workout days"
          >
            <Text style={styles.continueButtonText}>
              {saving ? 'Opening builder...' : 'Continue to Build Workouts'}
            </Text>
            <Text style={styles.continueButtonArrow}>›</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    </View>
  )
}

function FieldLabel({
  label,
  required = false,
}: {
  label: string
  required?: boolean
}) {
  return (
    <Text style={styles.fieldLabel}>
      {label}
      {required ? <Text style={styles.requiredMark}> *</Text> : null}
    </Text>
  )
}

function ChoiceGrid({
  options,
  selectedValue,
  onSelect,
}: {
  options: string[]
  selectedValue: string
  onSelect: (value: string) => void
}) {
  return (
    <View style={styles.choiceGrid}>
      {options.map((option) => {
        const isSelected = selectedValue === option

        return (
          <Pressable
            key={option}
            style={[
              styles.choiceButton,
              isSelected && styles.choiceButtonActive,
            ]}
            onPress={() => onSelect(option)}
            accessibilityRole="radio"
            accessibilityLabel={option}
            accessibilityState={{ selected: isSelected }}
          >
            <Text
              style={[
                styles.choiceButtonText,
                isSelected && styles.choiceButtonTextActive,
              ]}
            >
              {option}
            </Text>
          </Pressable>
        )
      })}
    </View>
  )
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

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#F5FAF6',
  },

  safeArea: {
    flex: 1,
    backgroundColor: '#F5FAF6',
  },

  topBar: {
    minHeight: 54,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F5FAF6',
    borderBottomWidth: 1,
    borderBottomColor: '#E2ECE6',
  },

  backButton: {
    flex: 1,
    paddingVertical: 10,
  },

  backButtonText: {
    color: '#1E5C35',
    fontSize: 14,
    fontWeight: '800',
  },

  topBarTitle: {
    color: '#16281D',
    fontSize: 15,
    fontWeight: '800',
  },

  topBarSpacer: {
    flex: 1,
  },

  content: {
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 34,
  },

  progressRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },

  progressItem: {
    width: 74,
    alignItems: 'center',
  },

  progressDot: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
    backgroundColor: '#E2ECE6',
  },

  progressDotActive: {
    backgroundColor: '#1E5C35',
  },

  progressDotText: {
    color: '#6C8074',
    fontSize: 12,
    fontWeight: '800',
  },

  progressDotTextActive: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },

  progressLabel: {
    marginTop: 6,
    color: '#7C8F83',
    fontSize: 10,
    fontWeight: '700',
    textAlign: 'center',
  },

  progressLabelActive: {
    marginTop: 6,
    color: '#1E5C35',
    fontSize: 10,
    fontWeight: '800',
    textAlign: 'center',
  },

  progressLine: {
    flex: 1,
    height: 2,
    marginTop: 13,
    backgroundColor: '#D8E5DD',
  },

  pageHeading: {
    marginTop: 24,
    color: '#16281D',
    fontSize: 26,
    fontWeight: '800',
    letterSpacing: -0.4,
  },

  pageSubtitle: {
    marginTop: 7,
    color: '#5C7267',
    fontSize: 14,
    lineHeight: 21,
  },

  safetyCard: {
    marginTop: 18,
    padding: 14,
    flexDirection: 'row',
    borderRadius: 16,
    backgroundColor: '#FFF7E5',
    borderWidth: 1,
    borderColor: '#F3DEAA',
  },

  safetyIcon: {
    width: 24,
    height: 24,
    overflow: 'hidden',
    color: '#8A5A09',
    fontSize: 15,
    fontWeight: '900',
    lineHeight: 24,
    textAlign: 'center',
    borderRadius: 12,
    backgroundColor: '#F7D98B',
  },

  safetyTextWrap: {
    flex: 1,
    marginLeft: 10,
  },

  safetyTitle: {
    color: '#704A08',
    fontSize: 13,
    fontWeight: '800',
  },

  safetyText: {
    marginTop: 3,
    color: '#7A6131',
    fontSize: 12,
    lineHeight: 17,
  },

  sectionTitle: {
    marginTop: 27,
    marginBottom: 5,
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

  fieldLabel: {
    marginTop: 16,
    marginBottom: 8,
    color: '#16281D',
    fontSize: 13,
    fontWeight: '800',
  },

  requiredMark: {
    color: '#B3261E',
  },

  fieldHint: {
    marginTop: -3,
    marginBottom: 10,
    color: '#71857A',
    fontSize: 11,
    lineHeight: 16,
  },

  textInput: {
    minHeight: 50,
    paddingHorizontal: 14,
    color: '#16281D',
    fontSize: 14,
    borderRadius: 13,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D6E4DB',
  },

  multilineInput: {
    minHeight: 106,
    paddingTop: 13,
    paddingBottom: 13,
  },

  choiceGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginRight: -8,
  },

  choiceButton: {
    marginRight: 8,
    marginBottom: 9,
    paddingHorizontal: 13,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D6E4DB',
  },

  choiceButtonActive: {
    backgroundColor: '#E6F2E9',
    borderColor: '#1E5C35',
  },

  choiceButtonText: {
    color: '#5C7267',
    fontSize: 12,
    fontWeight: '700',
  },

  choiceButtonTextActive: {
    color: '#1E5C35',
    fontWeight: '800',
  },

  numberFieldRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  numberInput: {
    flex: 1,
  },

  numberFieldUnit: {
    width: 76,
    marginLeft: 10,
    color: '#5C7267',
    fontSize: 13,
    fontWeight: '700',
  },

  dayRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },

  dayButton: {
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D6E4DB',
  },

  dayButtonActive: {
    backgroundColor: '#1E5C35',
    borderColor: '#1E5C35',
  },

  dayButtonText: {
    color: '#5C7267',
    fontSize: 11,
    fontWeight: '800',
  },

  dayButtonTextActive: {
    color: '#FFFFFF',
  },

  multiChoiceWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginRight: -8,
  },

  multiChoiceButton: {
    marginRight: 8,
    marginBottom: 9,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D6E4DB',
  },

  multiChoiceButtonActive: {
    backgroundColor: '#E6F2E9',
    borderColor: '#1E5C35',
  },

  multiChoiceText: {
    color: '#5C7267',
    fontSize: 12,
    fontWeight: '700',
  },

  multiChoiceTextActive: {
    color: '#1E5C35',
    fontWeight: '800',
  },

  bottomNotice: {
    marginTop: 24,
    padding: 13,
    borderRadius: 14,
    backgroundColor: '#EAF4ED',
    borderWidth: 1,
    borderColor: '#D7E8DC',
  },

  bottomNoticeText: {
    color: '#426353',
    fontSize: 12,
    lineHeight: 18,
    textAlign: 'center',
  },

  continueButton: {
    minHeight: 54,
    marginTop: 14,
    paddingHorizontal: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
    backgroundColor: '#1E5C35',
  },

  continueButtonDisabled: {
    opacity: 0.65,
  },

  continueButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },

  continueButtonArrow: {
    position: 'absolute',
    right: 18,
    color: '#FFFFFF',
    fontSize: 25,
    fontWeight: '300',
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

})
