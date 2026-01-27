import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, SafeAreaView } from 'react-native';

const EstablishmentScreen = () => {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState([]);

  // Replace with your actual API endpoint
  const API_URL = 'https://bytetech.onrender.com/api/establishment';

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const response = await fetch(API_URL);
      const json = await response.json();
      setData(json);
    } catch (error) {
      console.error("Error fetching establishments:", error);
    } finally {
      setLoading(false);
    }
  };

  const renderItem = ({ item }) => (
    <View style={styles.card}>
      <View style={styles.iconPlaceholder}>
        <Text style={{fontSize: 20}}>🏢</Text>
      </View>
      <View style={styles.infoContainer}>
        <Text style={styles.name}>{item.name}</Text>
        <Text style={styles.type}>{item.type}</Text>
        {/* Placeholder for the emission data from your screenshot */}
        <Text style={styles.stats}>38.4 tons  <Text style={{color: '#4CAF50'}}>▲ 6%</Text></Text>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.header}>Establishments</Text>
      <Text style={styles.subHeader}>Top 20% Emission Contributors</Text>
      
      {loading ? (
        <ActivityIndicator size="large" color="#2E7D32" />
      ) : (
        <FlatList
          data={data}
          keyExtractor={(item) => item.establishment_id.toString()}
          renderItem={renderItem}
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9F9', padding: 16 },
  header: { fontSize: 22, fontWeight: 'bold', textAlign: 'center', marginVertical: 10, color: '#333' },
  subHeader: { fontSize: 14, color: '#666', marginBottom: 20, textAlign: 'center' },
  card: {
    flexDirection: 'row',
    backgroundColor: '#FFF',
    padding: 15,
    borderRadius: 12,
    marginBottom: 10,
    alignItems: 'center',
    elevation: 2, // Shadow for Android
    shadowColor: '#000', // Shadow for iOS
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
  },
  iconPlaceholder: { width: 50, height: 50, borderRadius: 25, backgroundColor: '#E8F5E9', justifyContent: 'center', alignItems: 'center' },
  infoContainer: { marginLeft: 15 },
  name: { fontSize: 16, fontWeight: 'bold', color: '#333' },
  type: { fontSize: 12, color: '#888' },
  stats: { fontSize: 14, fontWeight: '600', marginTop: 4, color: '#444' }
});

export default EstablishmentScreen;