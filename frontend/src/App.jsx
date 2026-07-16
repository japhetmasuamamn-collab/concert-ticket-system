function App() {
  return (
    <Router>
      <Routes>
        <Route path="/ticket/:codeUnique" element={<h1>TICKET OK</h1>} />
        <Route path="/" element={<h1>LOGIN</h1>} />
      </Routes>
    </Router>
  );
}
