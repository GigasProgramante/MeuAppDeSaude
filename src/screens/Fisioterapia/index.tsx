import React from 'react';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/AppNavigator';
import ProfileScreen from '../Perfil';

type FisioterapiaNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Fisioterapia'>;

interface Props {
  navigation: FisioterapiaNavigationProp;
}

export default function TelaFisioterapia({ navigation }: Props) {
  return <ProfileScreen navigation={navigation} initialTabOverride="fisioterapia" />;
}
