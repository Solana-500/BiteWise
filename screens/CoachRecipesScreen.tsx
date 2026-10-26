import { useCallback, useState } from 'react'
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, Text, TextInput, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useFocusEffect } from '@react-navigation/native'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import { supabase } from '../services/supabase'
import { type CoachRecipeDraft, type CoachRecipeRoutes, loadLocalRecipes, recipeStyles as styles } from '../services/coachRecipeDrafts'

type Props = NativeStackScreenProps<CoachRecipeRoutes, 'CoachRecipes'>

export default function CoachRecipesScreen({ navigation }: Props) {
  const [recipes, setRecipes] = useState<CoachRecipeDraft[]>([])
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [refreshing, setRefreshing] = useState(false)

  useFocusEffect(useCallback(() => {
    let active = true
    async function load() {
      try {
        setError('')
        const { data: { user }, error: authError } = await supabase.auth.getUser()
        if (authError) throw authError
        if (!user) throw new Error('Please log in again.')
        const saved = await loadLocalRecipes(user.id)
        if (active) setRecipes(saved)
      } catch (err) {
        if (active) setError(err instanceof Error ? err.message : 'Unable to load recipes.')
      } finally {
        if (active) { setLoading(false); setRefreshing(false) }
      }
    }
    void load()
    return () => { active = false }
  }, [refreshing]))

  const filtered = recipes.filter((recipe) =>
    `${recipe.title} ${recipe.dietaryNotes}`.toLowerCase().includes(query.trim().toLowerCase())
  )

  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => setRefreshing(true)} />}>
        <Pressable onPress={() => navigation.goBack()} accessibilityRole="button"><Text style={styles.back}>‹ Content</Text></Pressable>
        <Text style={styles.title}>Coach Recipes</Text>
        <Text style={styles.subtitle}>Create clear, practical recipes for your coaching library.</Text>
        <Pressable style={styles.button} onPress={() => navigation.navigate('CoachRecipesBuilder')} accessibilityRole="button">
          <Text style={styles.buttonText}>＋ Create Recipe</Text>
        </Pressable>
        <View style={styles.notice}><Text style={styles.noticeText}>Drafts are saved on this device for your account. They are not submitted for admin approval or shared with clients.</Text></View>
        <TextInput style={styles.input} value={query} onChangeText={setQuery} placeholder="Search recipes or dietary notes" accessibilityLabel="Search recipes" />
        <Text style={styles.heading}>Draft recipes · {filtered.length}</Text>
        {loading ? <ActivityIndicator color="#1E5C35" /> : error ? (
          <View style={styles.card}><Text style={styles.text}>{error}</Text></View>
        ) : filtered.length === 0 ? (
          <View style={styles.card}>
            <Text style={styles.heading}>{query ? 'No matching recipes' : 'Your recipe library starts here'}</Text>
            <Text style={styles.text}>{query ? 'Try another search.' : 'Create a recipe, review the details, then save it as a draft.'}</Text>
          </View>
        ) : filtered.map((recipe) => (
          <Pressable key={recipe.id} style={styles.card} onPress={() => navigation.navigate('CoachRecipesReview', { recipe })} accessibilityRole="button">
            <View style={styles.chip}><Text style={styles.chipText}>DRAFT</Text></View>
            <Text style={styles.heading}>{recipe.title.trim() || 'Untitled recipe'}</Text>
            <Text style={styles.text}>{recipe.description || 'No description yet'}</Text>
            <Text style={styles.subtitle}>{recipe.servings || '—'} servings · {recipe.ingredients.length} ingredients</Text>
            <Text style={styles.secondaryText}>Review recipe ›</Text>
          </Pressable>
        ))}
      </ScrollView>
    </SafeAreaView>
  )
}
