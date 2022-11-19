const getDate = () => {
    const date = new Date();
    return date.toISOString().split('T')[0];
}
