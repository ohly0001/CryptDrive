import Group from '../models/Group.js';
import Account from '../models/Account.js';

const createGroup = async (req, res) => {
    try {
        const { name, joinCode, maxMembers } = req.body;
        if (!name) return res.status(400).json({ message: "Group name required" });

        const group = new Group({
            name,
            owner: req.user._id,
            members: [req.user._id],
            maxMembers: maxMembers || 10,
            joinCode: joinCode || null
        });

        if (joinCode) await group.secure();

        await group.save();
        res.json({ message: "Group created", group });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Server error" });
    }
};

const listGroups = async (req, res) => {
    try {
        const { limit = 50, offset = 0, searchTerm = "", searchTags = [], favouritesOnly } = req.body;

        const query = {
            $or: [
                { owner: req.user._id },
                { members: req.user._id }
            ]
        };

        if (searchTerm) query.name = { $regex: searchTerm, $options: 'i' };

        const groups = await Group.find(query)
            .skip(offset)
            .limit(limit)
            .populate("owner", "email")
            .populate("members", "email");

        // Add isOwner, isFavourite, tags
        const enriched = groups.map(g => ({
            _id: g._id,
            name: g.name,
            owner: g.owner.email,
            members: g.members.map(m => m.email),
            tags: g.tags || [],
            isOwner: g.owner._id.equals(req.user._id),
            isFavourite: g.favourites?.includes(req.user._id) || false
        }));

        res.json({ groups: enriched, total: enriched.length });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Server error" });
    }
};

const joinGroup = async (req, res) => {
    try {
        const { code } = req.body;
        if (!code) return res.status(400).json({ message: "Join code required" });

        const group = await Group.findOne({ joinCode: { $ne: null } });
        if (!group) return res.status(404).json({ message: "Group not found or no join code set" });

        const success = await group.addMember(req.user._id, code);
        if (!success) return res.status(400).json({ message: "Cannot join group (invalid code, full, or already member)" });

        res.json({ message: `Joined group ${group.name}` });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Server error" });
    }
};

const leaveGroup = async (req, res) => {
    try {
        const { id } = req.body;
        const group = await Group.findById(id);
        if (!group) return res.status(404).json({ message: "Group not found" });

        if (group.owner.equals(req.user._id)) {
            return res.status(400).json({ message: "Owner cannot leave their own group. Delete it instead." });
        }

        await group.removeMember(req.user._id);
        res.json({ message: `Left group ${group.name}` });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Server error" });
    }
};

const deleteGroup = async (req, res) => {
    try {
        const { id } = req.body;
        const group = await Group.findById(id);
        if (!group) return res.status(404).json({ message: "Group not found" });
        if (!group.owner.equals(req.user._id)) return res.status(403).json({ message: "Only owner can delete group" });

        await group.deleteOne();
        res.json({ message: `Deleted group ${group.name}` });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Server error" });
    }
};

const addMembers = async (req, res) => {
    try {
        const { id, values } = req.body;
        const group = await Group.findById(id);
        if (!group) return res.status(404).json({ message: "Group not found" });
        if (!group.owner.equals(req.user._id)) return res.status(403).json({ message: "Only owner can add members" });

        const added = [];
        for (let email of values) {
            const user = await Account.findOne({ email });
            if (!user) continue;
            if (!group.members.some(m => m.equals(user._id)) && group.members.length < group.maxMembers) {
                group.members.push(user._id);
                added.push(user.email);
            }
        }
        await group.save();
        res.json({ message: `Added members: ${added.join(", ")}` });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Server error" });
    }
};

const removeMembers = async (req, res) => {
    try {
        const { id, values } = req.body;
        const group = await Group.findById(id);
        if (!group) return res.status(404).json({ message: "Group not found" });
        if (!group.owner.equals(req.user._id)) return res.status(403).json({ message: "Only owner can remove members" });

        const removed = [];
        for (let email of values) {
            const user = await Account.findOne({ email });
            if (!user) continue;
            if (group.members.some(m => m.equals(user._id))) {
                group.members.pull(user._id);
                removed.push(user.email);
            }
        }
        await group.save();
        res.json({ message: `Removed members: ${removed.join(", ")}` });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Server error" });
    }
};

// Favourite toggle
const toggleFavourite = async (req, res) => {
    try {
        const { id, state } = req.body;
        const group = await Group.findById(id);
        if (!group) return res.status(404).json({ message: "Group not found" });

        group.favourites = group.favourites || [];
        if (state) {
            if (!group.favourites.includes(req.user._id)) group.favourites.push(req.user._id);
        } else {
            group.favourites = group.favourites.filter(f => !f.equals(req.user._id));
        }

        await group.save();
        res.json({ message: "Favourite toggled" });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Server error" });
    }
};

export default {
    createGroup,
    listGroups,
    joinGroup,
    leaveGroup,
    deleteGroup,
    addMembers,
    removeMembers,
    toggleFavourite
};