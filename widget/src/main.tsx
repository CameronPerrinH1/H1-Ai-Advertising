import { render } from 'preact';
import { App } from './App';
import { StaffApp } from './components/Staff';
import './styles.css';

const staff = new URLSearchParams(location.search).get('mode') === 'staff';
render(staff ? <StaffApp /> : <App />, document.getElementById('app')!);
