#pragma once
#include <string>
#include <vector>

/// The Shape namespace contains all geometry primitives.
namespace Geometry {

/**
 * @brief Abstract base class for geometric shapes.
 */
class Shape {
public:
    /**
     * @brief Calculate the area of the shape.
     * @return The computed area.
     */
    virtual double area() const = 0;

    /**
     * @brief Get the name of this shape.
     * @return Shape name as a string.
     */
    virtual std::string name() const = 0;

    virtual ~Shape() = default;
};

/**
 * @brief A circle with a given radius.
 */
class Circle : public Shape {
public:
    explicit Circle(double radius);
    double area() const override;
    std::string name() const override;

private:
    double radius_;
};

/**
 * @brief Templated container for shape collections.
 * @tparam T The shape type to store.
 */
template<typename T>
class ShapeCollection {
public:
    void add(const T& shape);
    double totalArea() const;

private:
    std::vector<T> shapes_;
};

enum class Direction {
    North,
    South,
    East,
    West
};

} // namespace Geometry
