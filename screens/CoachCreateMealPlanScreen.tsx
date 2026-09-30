import React, { useEffect, useState } from 'react'
import {
  Alert,
  Modal,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native'

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
  const [clientModalVisible, setClientModalVisible] = useState(false)
  const [assignedClients, setAssignedClients] = useState<AssignedClient[]>([])
  const [loadingClients, setLoadingClients] = useState(true)
  const [clientsError, setClientsError] = useState('')

  const [planTitle, setPlanTitle] = useState('')
  const [goal, setGoal] = useState('')
  const [duration, setDuration] = useState('')
  const [calorieTarget, setCalorieTarget] = useState('')
  const [coachNotes, setCoachNotes] = useState('')

  useEffect(() => {
    loadAssignedClients()
  }, [])

  const loadAssignedClients = async () => {
    try {
      setLoadingClients(true)
      setClientsError('')

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser()

      if (userError) {
        throw userError
      }

      if (!user) {
        navigation.replace('Login')
        return
      }

      const { data: assignments, error: assignmentsError } = await supabase
        .from('coach_assignments')
        .select('client_id')
        .eq('coach_id', user.id)

      if (assignmentsError) {
        throw assignmentsError
      }

      const clientIds = (assignments ?? []).map(
        (assignment) => assignment.client_id
      )

      if (clientIds.length === 0) {
        setAssignedClients([])
        return
      }

      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select(`
          id,
          full_name,
          fitness_goal,
          daily_calorie_target,
          dietary_preferences,
          allergies
        `)
        .in('id', clientIds)
        .order('full_name', { ascending: true })

      if (profilesError) {
        throw profilesError
      }

      const clients: AssignedClient[] = (profiles ?? []).map((profile) => ({
        id: profile.id,
        name: profile.full_name || 'Unnamed client',
        goal: profile.fitness_goal || 'Maintenance',
        calorieTarget: profile.daily_calorie_target,
        dietaryPreferences: profile.dietary_preferences ?? [],
        allergies: profile.allergies ?? [],
      }))

      setAssignedClients(clients)
    } catch (error: any) {
      console.error('Unable to load assigned clients:', error)

      setClientsError(
        error?.message ||
          'Unable to load your assigned clients. Please try again.'
      )
    } finally {
      setLoadingClients(false)
    }
  }

  const selectClient = (client: AssignedClient) => {
    setSelectedClient(client)
    setClientModalVisible(false)

    if (!goal) {
      setGoal(client.goal || 'Maintenance')
    }

    if (!calorieTarget && client.calorieTarget) {
      setCalorieTarget(String(client.calorieTarget))
    }

    if (!planTitle) {
      setPlanTitle(`${client.name}'s Meal Plan`)
    }
  }

  const validatePlanBasics = () => {
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

    if (!calorieTarget.trim() || Number(calorieTarget) <= 0) {
      Alert.alert(
        'Valid calorie target required',
        'Enter a daily calorie target greater than 0.'
      )
      return false
    }

    return true
  }

  const saveDraft = () => {
    if (!validatePlanBasics()) {
      return
    }

    Alert.alert(
      'Draft not saved yet',
      'Finish building the meal plan first. The Review screen will save the complete plan to Supabase as a draft.'
    )
  }

  const continueToMealBuilder = () => {
    if (!validatePlanBasics() || !selectedClient) {
      return
    }

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
            Start with the client and plan details. You can save a draft at any
            time before submitting it for admin approval.
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

          <Pressable
            style={styles.clientSelector}
            onPress={() => setClientModalVisible(true)}
            accessibilityRole="button"
            accessibilityLabel="Choose an assigned client"
          >
            {selectedClient ? (
              <View style={styles.selectedClientContent}>
                <View style={styles.clientInitialCircle}>
                  <Text style={styles.clientInitial}>
                    {selectedClient.name.charAt(0).toUpperCase()}
                  </Text>
                </View>

                <View style={styles.selectedClientTextWrap}>
                  <Text style={styles.selectedClientName}>
                    {selectedClient.name}
                  </Text>
                  <Text style={styles.selectedClientGoal}>
                    {selectedClient.goal} ·{' '}
                    {selectedClient.calorieTarget
                      ? `${selectedClient.calorieTarget.toLocaleString()} kcal/day`
                      : 'No calorie target'}
                  </Text>
                </View>
              </View>
            ) : (
              <Text style={styles.clientPlaceholder}>
                Choose an assigned client
              </Text>
            )}

            <Text style={styles.selectorChevron}>›</Text>
          </Pressable>

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
                    selectedClient.allergies.length > 0 &&
                      styles.allergyWarning,
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
          <View style={styles.choiceWrap}>
            {GOALS.map((item) => {
              const isSelected = goal === item

              return (
                <Pressable
                  key={item}
                  style={[
                    styles.choiceButton,
                    isSelected && styles.choiceButtonActive,
                  ]}
                  onPress={() => setGoal(item)}
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

          <Text style={styles.inputLabel}>Plan duration</Text>
          <View style={styles.choiceWrap}>
            {DURATIONS.map((item) => {
              const isSelected = duration === item

              return (
                <Pressable
                  key={item}
                  style={[
                    styles.choiceButton,
                    isSelected && styles.choiceButtonActive,
                  ]}
                  onPress={() => setDuration(item)}
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
              Saving a draft does not send anything to the client or admin.
            </Text>
          </View>

          <View style={styles.bottomActions}>
            <Pressable
              style={styles.saveDraftButton}
              onPress={saveDraft}
              accessibilityRole="button"
              accessibilityLabel="Save meal plan draft"
            >
              <Text style={styles.saveDraftButtonText}>Save Draft</Text>
            </Pressable>

            <Pressable
              style={styles.continueButton}
              onPress={continueToMealBuilder}
              accessibilityRole="button"
              accessibilityLabel="Continue to add meals"
            >
              <Text style={styles.continueButtonText}>Add Meals ›</Text>
            </Pressable>
          </View>
        </ScrollView>
      </SafeAreaView>

      <Modal
        visible={clientModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setClientModalVisible(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setClientModalVisible(false)}
        >
          <Pressable
            style={styles.modalCard}
            onPress={(event) => event.stopPropagation()}
          >
            <View style={styles.modalHandle} />

            <Text style={styles.modalTitle}>Choose client</Text>
            <Text style={styles.modalSubtitle}>
              Only clients assigned to you can receive a plan.
            </Text>

            {loadingClients ? (
              <View style={styles.modalStateCard}>
                <Text style={styles.modalStateText}>
                  Loading assigned clients...
                </Text>
              </View>
            ) : clientsError ? (
              <View style={styles.modalStateCard}>
                <Text style={styles.modalStateError}>{clientsError}</Text>

                <Pressable
                  style={styles.retryButton}
                  onPress={loadAssignedClients}
                  accessibilityRole="button"
                  accessibilityLabel="Retry loading assigned clients"
                >
                  <Text style={styles.retryButtonText}>Try Again</Text>
                </Pressable>
              </View>
            ) : assignedClients.length === 0 ? (
              <View style={styles.modalStateCard}>
                <Text style={styles.modalStateText}>
                  No clients are currently assigned to you.
                </Text>
              </View>
            ) : (
              assignedClients.map((client) => {
                const isSelected = selectedClient?.id === client.id

                return (
                  <Pressable
                    key={client.id}
                    style={[
                      styles.clientOption,
                      isSelected && styles.clientOptionSelected,
                    ]}
                    onPress={() => selectClient(client)}
                    accessibilityRole="button"
                    accessibilityLabel={`Choose ${client.name}`}
                    accessibilityState={{ selected: isSelected }}
                  >
                    <View style={styles.clientInitialCircle}>
                      <Text style={styles.clientInitial}>
                        {client.name.charAt(0).toUpperCase()}
                      </Text>
                    </View>

                    <View style={styles.clientOptionTextWrap}>
                      <Text style={styles.clientOptionName}>{client.name}</Text>
                      <Text style={styles.clientOptionMeta}>
                        {client.goal} ·{' '}
                        {client.calorieTarget
                          ? `${client.calorieTarget.toLocaleString()} kcal/day`
                          : 'No calorie target'}
                      </Text>
                    </View>

                    {isSelected ? (
                      <Text style={styles.selectedCheck}>✓</Text>
                    ) : null}
                  </Pressable>
                )
              })
            )}

            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => setClientModalVisible(false)}
              accessibilityRole="button"
              accessibilityLabel="Close client selection"
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
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

  clientSelector: {
    minHeight: 62,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 15,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#DDE9E1',
  },
  clientPlaceholder: {
    flex: 1,
    color: '#8B9D92',
    fontSize: 14,
    fontWeight: '600',
  },
  selectedClientContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  clientInitialCircle: {
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 19,
    backgroundColor: '#E6F1E9',
  },
  clientInitial: {
    color: '#1E5C35',
    fontSize: 15,
    fontWeight: '800',
  },
  selectedClientTextWrap: {
    flex: 1,
    marginLeft: 10,
  },
  selectedClientName: {
    color: '#16281D',
    fontSize: 14,
    fontWeight: '800',
  },
  selectedClientGoal: {
    marginTop: 3,
    color: '#5C7267',
    fontSize: 11,
    fontWeight: '600',
  },
  selectorChevron: {
    marginLeft: 10,
    color: '#1E5C35',
    fontSize: 25,
    fontWeight: '300',
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
    paddingLeft: 14,
    paddingRight: 14,
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

  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(12, 27, 17, 0.42)',
  },
  modalCard: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 26,
    borderTopLeftRadius: 25,
    borderTopRightRadius: 25,
    backgroundColor: '#F5FAF6',
  },
  modalHandle: {
    width: 42,
    height: 4,
    alignSelf: 'center',
    borderRadius: 3,
    backgroundColor: '#B7C9BD',
  },
  modalTitle: {
    marginTop: 19,
    color: '#16281D',
    fontSize: 21,
    fontWeight: '800',
  },
  modalSubtitle: {
    marginTop: 5,
    marginBottom: 14,
    color: '#5C7267',
    fontSize: 13,
    lineHeight: 19,
  },

  clientOption: {
    minHeight: 66,
    marginBottom: 10,
    paddingHorizontal: 13,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 15,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E0EBE3',
  },
  clientOptionSelected: {
    borderColor: '#1E5C35',
    backgroundColor: '#F0F8F2',
  },
  clientOptionTextWrap: {
    flex: 1,
    marginLeft: 10,
  },
  clientOptionName: {
    color: '#16281D',
    fontSize: 14,
    fontWeight: '800',
  },
  clientOptionMeta: {
    marginTop: 3,
    color: '#5C7267',
    fontSize: 11,
    fontWeight: '600',
  },
  selectedCheck: {
    color: '#1E5C35',
    fontSize: 18,
    fontWeight: '900',
  },

  modalStateCard: {
    marginBottom: 12,
    padding: 16,
    alignItems: 'center',
    borderRadius: 15,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E0EBE3',
  },
  modalStateText: {
    color: '#5C7267',
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'center',
    lineHeight: 19,
  },
  modalStateError: {
    color: '#A13D27',
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'center',
    lineHeight: 19,
  },
  retryButton: {
    marginTop: 12,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 11,
    backgroundColor: '#1E5C35',
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },

  cancelButton: {
    height: 48,
    marginTop: 3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButtonText: {
    color: '#1E5C35',
    fontSize: 14,
    fontWeight: '800',
  },
})
