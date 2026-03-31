
import NavBar from './NavBar';
import '../style/general-component.css';

export default function Homepage() {
  return (
    <>
      <NavBar />
      <div className="homepage">
        <h1>Welcome to UET Compass</h1>
        <p>Your personalized learning and skill development platform.</p>
      </div>
    </>
  );
}
